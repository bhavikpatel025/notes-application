import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLabelsModalComponent } from './edit-labels-modal.component';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('EditLabelsModalComponent', () => {
  let component: EditLabelsModalComponent;
  let fixture: ComponentFixture<EditLabelsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLabelsModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditLabelsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
