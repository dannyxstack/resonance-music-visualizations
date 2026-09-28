export class SpectralFlux {
  private previous: Uint8Array<ArrayBufferLike> | null = null;

  update(frequencyData: Uint8Array<ArrayBufferLike>): number {
    if (!this.previous || this.previous.length !== frequencyData.length) {
      this.previous = new Uint8Array(frequencyData);
      return 0;
    }

    let positiveDelta = 0;
    for (let index = 0; index < frequencyData.length; index += 1) {
      const delta = frequencyData[index] - this.previous[index];
      if (delta > 0) {
        positiveDelta += delta;
      }
      this.previous[index] = frequencyData[index];
    }

    return Math.min(1, positiveDelta / (frequencyData.length * 72));
  }

  reset(): void {
    this.previous = null;
  }
}
