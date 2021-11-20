export class Update {
  constructor(payload) {
    this.payload = payload;
  }
}

export class UpdateQueue {
  constructor() {
    this.firstUpdate = null;
    this.lastUpdate = null;
  }
  enqueueUpdate(update) {
    if (!this.lastUpdate) {
      this.firstUpdate = update;
      this.lastUpdate = update;
    } else {
      this.lastUpdate.nextUpdate = update;
      this.lastUpdate = update;
    }
  }
  forceUpdate(state) {
    let currentUpdate = this.firstUpdate;
    while (currentUpdate) {
      const nextState =
        typeof currentUpdate.payload === 'function'
          ? currentUpdate.payload(state)
          : currentUpdate.payload;
      state = {
        ...state,
        ...nextState,
      };
      currentUpdate = currentUpdate.nextUpdate;
    }
    this.firstUpdate = this.lastUpdate = null;
    return state;
  }
}
