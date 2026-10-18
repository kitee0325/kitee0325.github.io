const key = 'kitee-aquarium-demo-v1.3';
let remembered = false;
export class Demo {
  done = remembered;
  elapsed = 0;
  age = 0;
  wiggling = false;
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      this.storage ??=
        typeof window === 'undefined' ? undefined : window.sessionStorage;
      this.done ||= this.storage?.getItem(key) === 'done';
    } catch {
      /* Private browsing uses the module fallback. */
    }
  }
  cancel() {
    if (this.done) return;
    this.done = remembered = true;
    try {
      this.storage?.setItem(key, 'done');
    } catch {
      /* Keep the in-memory session flag. */
    }
  }
  step(dt: number, eligible: boolean): 'wiggle' | 'drop' | undefined {
    if (this.done) return;
    this.age += dt;
    if (!eligible) {
      this.elapsed = 0;
      this.wiggling = false;
      return;
    }
    if (this.age < 0.59) return;
    this.elapsed += dt;
    if (this.elapsed >= 1.7) {
      this.cancel();
      return 'drop';
    }
    if (this.elapsed >= 1.2 && !this.wiggling) {
      this.wiggling = true;
      return 'wiggle';
    }
  }
}
