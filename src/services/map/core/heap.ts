type THeapItem<T> = {
  value: T;
  cost: number;
  seq: number;
};

export class TDeterministicMinHeap<T> {
  private readonly items: Array<THeapItem<T>> = [];
  private sequence = 0;

  private compare(left: THeapItem<T>, right: THeapItem<T>) {
    if (left.cost !== right.cost) return left.cost - right.cost;
    return left.seq - right.seq;
  }

  private swap(leftIndex: number, rightIndex: number) {
    const temp = this.items[leftIndex];
    this.items[leftIndex] = this.items[rightIndex] as THeapItem<T>;
    this.items[rightIndex] = temp as THeapItem<T>;
  }

  private bubbleUp(startIndex: number) {
    let index = startIndex;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (
        this.compare(this.items[index] as THeapItem<T>, this.items[parent] as THeapItem<T>) >= 0
      ) {
        break;
      }
      this.swap(index, parent);
      index = parent;
    }
  }

  private bubbleDown(startIndex: number) {
    let index = startIndex;
    const length = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (
        left < length &&
        this.compare(this.items[left] as THeapItem<T>, this.items[smallest] as THeapItem<T>) < 0
      ) {
        smallest = left;
      }
      if (
        right < length &&
        this.compare(this.items[right] as THeapItem<T>, this.items[smallest] as THeapItem<T>) < 0
      ) {
        smallest = right;
      }
      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  push(value: T, cost: number) {
    this.items.push({ value, cost, seq: this.sequence });
    this.sequence += 1;
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const root = this.items[0] as THeapItem<T>;
    const tail = this.items.pop() as THeapItem<T> | undefined;
    if (this.items.length > 0 && tail) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }
    return root.value;
  }

  get size() {
    return this.items.length;
  }
}
