import { describe, it, expect, vi } from 'vitest';
import { RequestCoalescer } from '../lib/coalesce.js';

describe('RequestCoalescer', () => {
  it('runs the factory and returns its result', async () => {
    const coalescer = new RequestCoalescer<string>();
    const result = await coalescer.run('key1', async () => 'hello');
    expect(result).toBe('hello');
  });

  it('reuses an in-flight promise for the same key', async () => {
    const coalescer = new RequestCoalescer<string>();
    const factory = vi.fn().mockResolvedValue('shared');

    const [a, b] = await Promise.all([
      coalescer.run('dup', factory),
      coalescer.run('dup', factory),
    ]);

    expect(a).toBe('shared');
    expect(b).toBe('shared');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('allows different keys to run in parallel', async () => {
    const coalescer = new RequestCoalescer<string>();
    const factoryA = vi.fn().mockResolvedValue('A');
    const factoryB = vi.fn().mockResolvedValue('B');

    const [a, b] = await Promise.all([
      coalescer.run('keyA', factoryA),
      coalescer.run('keyB', factoryB),
    ]);

    expect(a).toBe('A');
    expect(b).toBe('B');
    expect(factoryA).toHaveBeenCalledTimes(1);
    expect(factoryB).toHaveBeenCalledTimes(1);
  });

  it('cleans up the key on failure so next call retries fresh', async () => {
    const coalescer = new RequestCoalescer<string>();
    let calls = 0;

    const factory = () => {
      calls++;
      if (calls === 1) return Promise.reject(new Error('boom'));
      return Promise.resolve('recovered');
    };

    await expect(coalescer.run('fail', factory)).rejects.toThrow('boom');
    const result = await coalescer.run('fail', factory);
    expect(result).toBe('recovered');
    expect(calls).toBe(2);
  });

  it('shares an error between concurrent callers', async () => {
    const coalescer = new RequestCoalescer<string>();
    const factory = vi.fn().mockRejectedValue(new Error('down'));

    const results = await Promise.allSettled([
      coalescer.run('err', factory),
      coalescer.run('err', factory),
    ]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('cleans up after successful completion', async () => {
    const coalescer = new RequestCoalescer<string>();
    const factory = vi.fn().mockResolvedValue('done');

    await coalescer.run('clean', factory);
    await coalescer.run('clean', factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });
});
