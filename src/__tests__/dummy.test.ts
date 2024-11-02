import { faker } from '@faker-js/faker';
import { describe, it, expect } from '@jest/globals';

describe('Dummy test', () => {
  it('should pass', () => {
    const a = faker.number.int();
    const b = faker.number.int();

    expect(a + b).toBe(b + a);
  });
});
