import { describe, expect, it, vi } from 'vitest';
import { createHapticController } from '../src/platform/haptics/controller';

describe('全局触感偏好和节流', () => {
  it('默认偏好读取并保存，本机关闭后所有反馈停止，重新开启可以反馈', () => {
    const emit = vi.fn(),
      write = vi.fn();
    const c = createHapticController({ read: () => false, write, active: () => true, emit });
    c.pulse();
    expect(emit).not.toHaveBeenCalled();
    const changed = vi.fn(),
      unsub = c.subscribe(changed);
    c.setEnabled(true);
    c.pulse('confirm');
    expect(emit).toHaveBeenCalledWith('confirm');
    expect(write).toHaveBeenLastCalledWith(true);
    expect(changed).toHaveBeenCalledOnce();
    unsub();
    c.setEnabled(false);
    c.pulse('impact');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledOnce();
  });
  it('快速重复按键限频，后台不震动；恢复后只响应新的操作', () => {
    let now = 0,
      active = true;
    const emit = vi.fn();
    const c = createHapticController({
      read: () => true,
      write: () => {},
      active: () => active,
      emit,
      now: () => now,
    });
    c.pulse();
    now = 30;
    c.pulse();
    now = 80;
    c.pulse('confirm');
    expect(emit).toHaveBeenCalledTimes(2);
    active = false;
    now = 200;
    c.pulse('impact');
    expect(emit).toHaveBeenCalledTimes(2);
    active = true;
    now = 300;
    c.pulse('success');
    expect(emit).toHaveBeenLastCalledWith('success');
  });
  it('存储、平台 API 和异步马达失败都不打断按钮动作', async () => {
    const c = createHapticController({
      read: () => {
        throw new Error('storage');
      },
      write: () => {
        throw new Error('storage');
      },
      active: () => true,
      emit: async () => {
        throw new Error('unsupported');
      },
    });
    expect(() => c.setEnabled(true)).not.toThrow();
    expect(() => c.pulse()).not.toThrow();
    await Promise.resolve();
    const throws = createHapticController({
      read: () => true,
      write: () => {},
      active: () => true,
      emit: () => {
        throw new Error('missing module');
      },
    });
    expect(() => throws.pulse()).not.toThrow();
  });
});
