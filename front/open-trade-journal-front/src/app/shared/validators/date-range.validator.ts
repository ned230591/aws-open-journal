import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Group-level validator: fails with `dateRangeInvalid` when both the start and
 * end controls have a value and start is after end. No-ops while either is empty,
 * so required-ness is left to the individual controls.
 */
export function dateRangeValidator(startControlName: string, endControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startControlName)?.value;
    const end = group.get(endControlName)?.value;
    if (!start || !end) {
      return null;
    }
    return start > end ? { dateRangeInvalid: true } : null;
  };
}
