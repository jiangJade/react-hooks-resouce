export class Update {
  constructor(payload) {
    this.payload = payload;
  }
}

// 数据结构是一个单链表

export class UpdateQueue {
  constructor() {
    this.firstUpdate = null;
    this.lastUpdate = null;
  }
  // 入队
  enqueueUpdate(update) {
    console.log(update, 'update');
    if (this.lastUpdate === null) {
      this.firstUpdate = this.lastUpdate = update;
    } else {
      this.lastUpdate.nextUpdate = update;
      this.lastUpdate = update;
    }
  }
  // 更新
  forceUpdate(state) {
    let currentUpdate = this.firstUpdate;
    while (currentUpdate) {
      // 如果是函数更新数据 否则直接用旧的数据
      //这里有点问题 state可能不是一个对象 先这样写没太大影响 后面优化
      let nextState =
        typeof currentUpdate.payload === 'function'
          ? currentUpdate.payload(state)
          : currentUpdate.payload;
      console.log(nextState, 'nextState');
      state = {
        ...state,
        ...nextState,
      };
      currentUpdate = currentUpdate.nextUpdate;
    }
    this.firstUpdate = this.lastUpdate = null; // 清空链表
    return state;
  }
}
