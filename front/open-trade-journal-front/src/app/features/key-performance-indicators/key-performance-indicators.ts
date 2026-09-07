import {Component, Input, Signal, signal} from '@angular/core';
import {CurrencyPipe, DecimalPipe} from '@angular/common';
import {DashboardStats} from '../../core/models/dashboard-stats.model';

@Component({
  selector: 'app-key-performance-indicators',
  imports: [
    CurrencyPipe,
    DecimalPipe
  ],
  templateUrl: './key-performance-indicators.html',
  styleUrl: './key-performance-indicators.css',
})
export class KeyPerformanceIndicators {
  @Input() stats!: Signal<DashboardStats | null>;
}
