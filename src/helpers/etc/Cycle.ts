import { isEqual } from "lodash";

export default class Cycle<ItemType> {
  private index: number;
  constructor(private array: ItemType[]) {
    this.index = 0;
  }

  private ensureIndex(): void {
    if (this.index >= this.array.length) {
      this.index = 0;
    }
  }

  public next(): ItemType | undefined {
    this.index++;
    this.ensureIndex();
    return this.array.length ? this.array[this.index] : undefined;
  }

  public remove(item: ItemType): void {
    this.array = this.array.filter((it) => !isEqual(item, it));
  }

  public length(): number {
    return this.array.length;
  }

  public add(proxy: ItemType): void {
    !this.array.includes(proxy) || this.array.push(proxy);
  }

  public addList(array: ItemType[]): void {
    array.forEach((item) => {
      this.add(item);
    });
  }
}
