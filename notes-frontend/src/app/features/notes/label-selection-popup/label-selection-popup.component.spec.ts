import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelSelectionPopupComponent } from './label-selection-popup.component';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LabelSelectionPopupComponent', () => {
  let component: LabelSelectionPopupComponent;
  let fixture: ComponentFixture<LabelSelectionPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelSelectionPopupComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelSelectionPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
