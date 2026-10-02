import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlaybookService } from '../services/playbook.service';
import { PlaybookDto, TradingType, Timeframe } from '../models/playbook.model';
import { logger } from '../../../../core/utils/logger';

@Component({
  selector: 'app-playbook-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './playbook-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaybookForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly playbookService = inject(PlaybookService);

  readonly playbookToEdit = input<PlaybookDto | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  saving = signal(false);
  errorMessage = '';
  defaultPlaybooks = signal<PlaybookDto[]>([]);
  selectedTemplateId: number | null = null;
  creatingNewStrategy = false;
  tradingTypes = Object.values(TradingType);
  timeframes = Object.values(Timeframe);
  entryRuleOptions = signal<string[]>([]);
  exitRuleOptions = signal<string[]>([]);
  selectedEntryRules = signal<string[]>([]);
  selectedExitRules = signal<string[]>([]);

  playbookForm = this.fb.nonNullable.group({
    strategy: ['', Validators.required],
    description: [''],
    tradingType: [TradingType.DAY_TRADING, Validators.required],
    timeframe: [Timeframe.FIFTEEN_MINUTES, Validators.required],
    riskManagement: [''],
    tradingConditions: [''],
  });

  ngOnInit(): void {
    this.loadDefaultPlaybooks();
    const editing = this.playbookToEdit();
    if (editing) {
      this.creatingNewStrategy = true;
      this.selectedTemplateId = null;
      this.playbookForm.patchValue({
        strategy: editing.strategy,
        description: editing.description ?? '',
        tradingType: editing.tradingType,
        timeframe: editing.timeframe,
        riskManagement: editing.riskManagement ?? '',
        tradingConditions: editing.tradingConditions ?? '',
      });
      this.entryRuleOptions.set([...(editing.entryRules ?? [])]);
      this.exitRuleOptions.set([...(editing.exitRules ?? [])]);
      this.selectedEntryRules.set([...(editing.entryRules ?? [])]);
      this.selectedExitRules.set([...(editing.exitRules ?? [])]);
    } else {
      this.startNewStrategy();
    }
  }

  loadDefaultPlaybooks(): void {
    this.playbookService.findDefaultPlaybooks(0, 100).subscribe({
      next: (response) => {
        this.defaultPlaybooks.set(response.content);
      },
      error: (error) => {
        logger.error(error);
        this.errorMessage = 'Unable to load default playbooks.';
        this.defaultPlaybooks.set([]);
      },
    });
  }

  onStrategySelected(value: string): void {
    if (!value || value === 'new') {
      this.startNewStrategy();
      return;
    }
    const templateId = Number(value);
    if (!templateId) {
      this.startNewStrategy();
      return;
    }
    const template = this.defaultPlaybooks().find((playbook) => playbook.id === templateId);
    if (!template) {
      return;
    }
    this.creatingNewStrategy = false;
    this.selectedTemplateId = template.id;
    this.playbookForm.patchValue({
      strategy: template.strategy,
      description: template.description ?? '',
      tradingType: template.tradingType,
      timeframe: template.timeframe,
      riskManagement: template.riskManagement ?? '',
      tradingConditions: template.tradingConditions ?? '',
    });
    this.entryRuleOptions.set([...(template.entryRules ?? [])]);
    this.exitRuleOptions.set([...(template.exitRules ?? [])]);
    this.selectedEntryRules.set([...(template.entryRules ?? [])]);
    this.selectedExitRules.set([...(template.exitRules ?? [])]);
  }

  startNewStrategy(): void {
    this.creatingNewStrategy = true;
    this.selectedTemplateId = null;
    this.playbookForm.reset({
      strategy: '',
      description: '',
      tradingType: TradingType.DAY_TRADING,
      timeframe: Timeframe.FIFTEEN_MINUTES,
      riskManagement: '',
      tradingConditions: '',
    });
    this.entryRuleOptions.set([]);
    this.exitRuleOptions.set([]);
    this.selectedEntryRules.set([]);
    this.selectedExitRules.set([]);
  }

  toggleEntryRule(rule: string): void {
    this.selectedEntryRules.update((rules) => {
      if (rules.includes(rule)) {
        return rules.filter((item) => item !== rule);
      }
      return [...rules, rule];
    });
  }

  isEntryRuleSelected(rule: string): boolean {
    return this.selectedEntryRules().includes(rule);
  }

  addEntryRule(input: HTMLInputElement): void {
    const rule = input.value.trim();
    if (!rule) {
      return;
    }
    if (this.entryRuleOptions().includes(rule)) {
      input.value = '';
      return;
    }
    this.entryRuleOptions.update((rules) => [...rules, rule]);
    this.selectedEntryRules.update((rules) => [...rules, rule]);
    input.value = '';
  }

  removeEntryRule(rule: string): void {
    this.entryRuleOptions.update((rules) => rules.filter((item) => item !== rule));
    this.selectedEntryRules.update((rules) => rules.filter((item) => item !== rule));
  }

  toggleExitRule(rule: string): void {
    this.selectedExitRules.update((rules) => {
      if (rules.includes(rule)) {
        return rules.filter((item) => item !== rule);
      }
      return [...rules, rule];
    });
  }

  isExitRuleSelected(rule: string): boolean {
    return this.selectedExitRules().includes(rule);
  }

  addExitRule(input: HTMLInputElement): void {
    const rule = input.value.trim();
    if (!rule) {
      return;
    }
    if (this.exitRuleOptions().includes(rule)) {
      input.value = '';
      return;
    }
    this.exitRuleOptions.update((rules) => [...rules, rule]);
    this.selectedExitRules.update((rules) => [...rules, rule]);
    input.value = '';
  }

  removeExitRule(rule: string): void {
    this.exitRuleOptions.update((rules) => rules.filter((item) => item !== rule));
    this.selectedExitRules.update((rules) => rules.filter((item) => item !== rule));
  }

  save(): void {
    if (this.playbookForm.invalid) {
      this.playbookForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage = '';
    const formValue = this.playbookForm.getRawValue();
    const editing = this.playbookToEdit();
    const playbook: PlaybookDto = {
      id: editing?.id ?? 0,
      userId: null,
      strategy: formValue.strategy.trim(),
      description: formValue.description.trim(),
      tradingType: formValue.tradingType,
      timeframe: formValue.timeframe,
      entryRules: this.selectedEntryRules(),
      exitRules: this.selectedExitRules(),
      riskManagement: formValue.riskManagement.trim(),
      tradingConditions: formValue.tradingConditions.trim(),
      systemDefined: false,
      active: true,
    };

    const request$ = editing
      ? this.playbookService.update(editing.id!, playbook)
      : this.playbookService.create(playbook);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (error) => {
        logger.error(error);
        this.errorMessage = editing ? 'Unable to update playbook.' : 'Unable to create playbook.';
        this.saving.set(false);
      },
    });
  }

  cancelForm(): void {
    this.cancelled.emit();
  }
}
