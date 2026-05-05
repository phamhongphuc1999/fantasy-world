export class TFifoQueue<T> {
  private readonly items: T[] = [];
  private head = 0;

  enqueue(item: T) {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head];
    this.head += 1;
    return item;
  }

  get size() {
    return this.items.length - this.head;
  }

  clear() {
    this.items.length = 0;
    this.head = 0;
  }
}
