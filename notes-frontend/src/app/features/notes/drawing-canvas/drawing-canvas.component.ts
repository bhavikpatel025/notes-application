import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../core/services/toast.service';

export type DrawingTool = 'select' | 'eraser' | 'pen' | 'marker' | 'highlighter';
export type GridType = 'none' | 'dots' | 'rules' | 'squares';

export interface ToolConfig {
  color: string;
  size: number;
}

@Component({
  selector: 'app-drawing-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drawing-canvas.component.html',
  styleUrls: ['./drawing-canvas.component.scss']
})
export class DrawingCanvasComponent implements OnInit {
  @Input() noteId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() drawingSaved = new EventEmitter<string>();

  @ViewChild('drawingCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private noteService = inject(NoteService);
  private toastService = inject(ToastService);

  // Active Tool & State
  activeTool: DrawingTool = 'pen';
  activeGrid: GridType = 'none';
  activeDropdown: 'tool' | 'grid' | 'more' | null = null;
  
  isDrawing = false;
  hasStrokes = false;
  isSaving = false;
  isFullscreen = false;
  showLongNotesHint = true;

  // Tool specific configurations
  toolConfigs: Record<'pen' | 'marker' | 'highlighter', ToolConfig> = {
    pen: { color: '#000000', size: 3 },
    marker: { color: '#1a73e8', size: 8 },
    highlighter: { color: '#fbbc04', size: 24 }
  };

  eraserSize = 24;

  // Undo / Redo Stacks (ImageData)
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxHistory = 25;

  // Drawing Path Points for Bezier curve smoothing
  private points: { x: number; y: number }[] = [];
  private ctx!: CanvasRenderingContext2D;

  // Predefined Google Keep Palette Colors
  paletteColors = [
    '#000000', '#ffffff', '#5f6368', '#4285f4', '#1a73e8',
    '#0d47a1', '#00acc1', '#00897b', '#43a047', '#7cb342',
    '#c0ca33', '#fdd835', '#ffb300', '#fb8c00', '#f4511e',
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab'
  ];

  // Stroke Sizes
  strokeSizes = [
    { label: 'Thin', pen: 2, marker: 5, highlighter: 16 },
    { label: 'Medium', pen: 4, marker: 8, highlighter: 24 },
    { label: 'Thick', pen: 8, marker: 14, highlighter: 36 },
    { label: 'Extra Thick', pen: 14, marker: 22, highlighter: 48 }
  ];

  ngOnInit(): void {
    // Detect dark mode to default pen color
    if (typeof document !== 'undefined' && !document.body.classList.contains('light-theme')) {
      this.toolConfigs.pen.color = '#ffffff';
    }
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    this.resizeCanvas();
    this.saveState(); // Initial blank state
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas(true);
  }

  private resizeCanvas(preserveContent: boolean = false): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    let previousImageData: ImageData | null = null;
    if (preserveContent && this.ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        previousImageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {}
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    this.ctx.scale(dpr, dpr);

    if (previousImageData) {
      this.ctx.putImageData(previousImageData, 0, 0);
    }
  }

  // Tool Switching
  selectTool(tool: DrawingTool): void {
    if (this.activeTool === tool && this.activeDropdown === 'tool') {
      this.activeDropdown = null;
      return;
    }
    
    // If clicking the already selected tool, open its dropdown
    if (this.activeTool === tool) {
      this.activeDropdown = 'tool';
    } else {
      this.activeTool = tool;
      this.activeDropdown = null;
    }
  }

  toggleDropdown(name: 'tool' | 'grid' | 'more'): void {
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  closeDropdowns(): void {
    this.activeDropdown = null;
  }

  dismissHint(): void {
    this.showLongNotesHint = false;
  }

  setColor(color: string): void {
    if (this.activeTool === 'pen' || this.activeTool === 'marker' || this.activeTool === 'highlighter') {
      this.toolConfigs[this.activeTool].color = color;
    }
  }

  setSize(sizeItem: { pen: number; marker: number; highlighter: number }): void {
    if (this.activeTool === 'pen') {
      this.toolConfigs.pen.size = sizeItem.pen;
    } else if (this.activeTool === 'marker') {
      this.toolConfigs.marker.size = sizeItem.marker;
    } else if (this.activeTool === 'highlighter') {
      this.toolConfigs.highlighter.size = sizeItem.highlighter;
    }
  }

  setGrid(grid: GridType): void {
    this.activeGrid = grid;
    this.activeDropdown = null;
  }

  // Pointer & Mouse Drawing Events
  onPointerDown(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.closeDropdowns();

    if (this.activeTool === 'select') {
      return;
    }

    this.isDrawing = true;
    this.hasStrokes = true;
    this.points = [];

    const pos = this.getCanvasCoordinates(event);
    this.points.push(pos);

    this.setupContextForActiveTool();
    this.drawPoint(pos.x, pos.y);
  }

  onPointerMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    event.preventDefault();

    const pos = this.getCanvasCoordinates(event);
    this.points.push(pos);

    this.drawSmoothCurve();
  }

  onPointerUp(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    event.preventDefault();

    this.isDrawing = false;
    this.points = [];
    this.saveState();
  }

  private getCanvasCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (window.TouchEvent && event instanceof TouchEvent) {
      if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      }
    } else if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private setupContextForActiveTool(): void {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.activeTool === 'pen') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.toolConfigs.pen.color;
      this.ctx.lineWidth = this.toolConfigs.pen.size;
      this.ctx.globalAlpha = 1.0;
    } else if (this.activeTool === 'marker') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.toolConfigs.marker.color;
      this.ctx.lineWidth = this.toolConfigs.marker.size;
      this.ctx.globalAlpha = 0.9;
    } else if (this.activeTool === 'highlighter') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.toolConfigs.highlighter.color;
      this.ctx.lineWidth = this.toolConfigs.highlighter.size;
      this.ctx.globalAlpha = 0.35;
    } else if (this.activeTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.eraserSize;
      this.ctx.globalAlpha = 1.0;
    }
  }

  private drawPoint(x: number, y: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, (this.ctx.lineWidth || 2) / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.fill();
  }

  private drawSmoothCurve(): void {
    if (this.points.length < 3) {
      const b = this.points[0];
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }

    const len = this.points.length;
    const p0 = this.points[len - 3];
    const p1 = this.points[len - 2];
    const p2 = this.points[len - 1];

    const cp1x = (p0.x + p1.x) / 2;
    const cp1y = (p0.y + p1.y) / 2;
    const cp2x = (p1.x + p2.x) / 2;
    const cp2y = (p1.y + p2.y) / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(cp1x, cp1y);
    this.ctx.quadraticCurveTo(p1.x, p1.y, cp2x, cp2y);
    this.ctx.stroke();
  }

  // Undo / Redo History
  private saveState(): void {
    const canvas = this.canvasRef.nativeElement;
    const state = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    if (!this.canUndo) return;
    const canvas = this.canvasRef.nativeElement;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previous = this.undoStack[this.undoStack.length - 1];
    this.ctx.putImageData(previous, 0, 0);
  }

  redo(): void {
    if (!this.canRedo) return;
    const canvas = this.canvasRef.nativeElement;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.ctx.putImageData(next, 0, 0);
  }

  clearCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.saveState();
    this.hasStrokes = false;
    this.activeDropdown = null;
    this.toastService.show({ message: 'Page cleared' });
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

    if (isCtrlOrCmd) {
      if (event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          event.preventDefault();
          this.redo();
        } else {
          event.preventDefault();
          this.undo();
        }
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        this.redo();
      }
    } else if (event.key === 'Escape') {
      if (this.activeDropdown) {
        this.closeDropdowns();
      } else {
        this.saveAndClose();
      }
    }
  }

  // Fullscreen toggle
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
      }).catch(() => {});
    }
  }

  // Download local drawing
  downloadDrawing(): void {
    const canvas = this.canvasRef.nativeElement;
    const link = document.createElement('a');
    link.download = `keep_drawing_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.activeDropdown = null;
  }

  // Save drawing & Return to Note (Google Keep Back Arrow Flow)
  saveAndClose(): void {
    if (this.isSaving) return;

    // If nothing was drawn, just close without saving
    if (!this.hasStrokes) {
      this.close.emit();
      return;
    }

    const canvas = this.canvasRef.nativeElement;

    // Create a temporary canvas to render clean drawing
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d')!;

    // Optional: Draw solid white background so image looks clean when embedded
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        this.close.emit();
        return;
      }

      this.isSaving = true;
      const file = new File([blob], `drawing_${Date.now()}.png`, { type: 'image/png' });

      this.noteService.uploadImage(file).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.toastService.show({ message: 'Drawing saved' });
          this.drawingSaved.emit(res.url);
          this.close.emit();
        },
        error: () => {
          this.isSaving = false;
          this.toastService.show({ message: 'Failed to upload drawing' });
          this.close.emit();
        }
      });
    }, 'image/png');
  }

  get currentColor(): string {
    if (this.activeTool === 'eraser') return '#ffffff';
    if (this.activeTool === 'select') return 'transparent';
    return this.toolConfigs[this.activeTool].color;
  }

  get currentSize(): number {
    if (this.activeTool === 'eraser') return this.eraserSize;
    if (this.activeTool === 'select') return 1;
    return this.toolConfigs[this.activeTool].size;
  }
}
