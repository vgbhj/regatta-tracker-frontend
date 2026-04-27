import { describe, it, expect } from 'vitest';
import { raceId, yachtId } from './domain';

describe('domain types', () => {
  it.todo('покрытие будет добавлено вместе с парсером и интерполяцией');

  it('placeholder: branded id constructors возвращают исходную строку', () => {
    expect(raceId('r-1')).toBe('r-1');
    expect(yachtId('y-1')).toBe('y-1');
  });
});
