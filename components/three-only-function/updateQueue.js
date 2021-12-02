// // 源码里面有一个updater 我们这儿做一下简化
// 1```
// export class Update {
//   constructor(payload) {
//     this.payload = payload;
//     }
// }
// ```;

// 2```
//   export class UpdateQueue {
//     custtructor() {
//       this.firsUpdate = null;
//       this.lastUpdate = null;
//     }
//     // 入队
//     2 enqueueUpdate(update) {
//       if(this.lastUpdate === null) {
//         // 头尾指针都指向update
//         this.firstUpdate = this.lastUpdate = update;
//       } else {
//         this.lastUpdate.nextUpdate = update;
//         this.lastUpdate = update;
//       }
//     }
//     3 用起来
//     forceUpdate(state) {
//       let currentUpdate = this.firstUpdate;
//       whlie(currentUpdate) {
//         let nextState = typeof currentUpdate.payload === "fucntion" ? currentUpdate.payload(state) : currentUpdate.payload;
//         state = {...state, ...nextState}; // state可能不为对象 这样写不太合适 等会儿来修改
//       }
//       currentUpdate = currentUpdate.nextUpdate;
//       this.firstUpdate = this.lastUpdate = null;
//       return state;
//     }
//   }
// ```;

// 3` 在reactjs里面引入
//   import {} from './UpdateQueue'
// `;

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

  // 入队  单链表
  enqueueUpdate(update) {
    if (this.lastUpdate === null) {
      // 首尾指针都指向update
      this.firstUpdate = this.lastUpdate = update;
    } else {
      this.lastUpdate.nextUpdate = update;
      this.lastUpdate = update;
    }
  }

  // 使用
  forceUpdate(state) {
    let currentUpdate = this.firstUpdate;
    while (currentUpdate) {
      let nextState =
        typeof currentUpdate.payload === 'function'
          ? currentUpdate.payload(state)
          : currentUpdate.payload;
      state = { ...state, ...nextState };
      currentUpdate = currentUpdate.nextUpdate;
    }
    this.firstUpdate = this.lastUpdate = null;
    return state;
  }
}
