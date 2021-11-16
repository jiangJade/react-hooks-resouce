class 组件提问
1 commitWork 新增 往上找；第一次渲染的时候 counter 和 div 是怎么挂载的

第一次 counter 下的 div 挂载到 currentRoot

第二次 counter 往下找 counter 又挂载了一次

为什么没有两个 dom 节点 因为 dom 去重了 appendChild 同一个节点，是移动

## class 组件实现逻辑

### 一 实现类组件

在 index 文件里面
1 声明一个 classCounter 类

```
import React from 'react';
import ReactDom from 'react-dom';

class ClassCounter extends React.Component {
  constructor(props) {
    super(props)
    this.state = {number: 0};
  }
  onClick = () => {
    this.stateState(state => ({number: state.number + 1}))
  }
  render() {
    return (
      <div id="counter">
        <span>{this.state.number}</span>
        <button onClick={this.onClick}>加 1</button>
      </div>
      )
    }
  }

  ReactDom.render(<ClassCounter />,document.getElementById('root'))
}

```

### 三 在 index 文件里面先用原生的 react 试一下效果 然后将 render2 两个按钮干掉

2 在 react.js 里面声明一个

```
class Component {
  constructor(props) {
    this.props = props;
    <!-- this.updateQueue = new UpdateQueue(); -->
  }
  setState(payload) { // 可能是一个对象 也可能是一个函数

  }
}

3 在React变里面导出

4 添加 Component.prototype.isReactComponent = {}; // 如果是类组件 源码就是这样写的
5 声明updateQueue.js文件

6 然后将react.js文件里面的 this.updateQueue = new UpdateQueue(); 代码放开

7 在setState函数来里面
let update = new Update(payload);
this.updateQueue.enqueueUpdate(update);
然后从根节点开始调度
在源码里面updateQueue没有放在component上面
updateQueue其实是放在此类组件对应的fiber节点的 internalFiber上

将this.updateQueue.enqueueUpdate(update) 注释掉

再将this.updateQueue = new UpdateQueue() 注释掉

this.internalFiber.updateQueue.enqueueUpdate(update)
scheduleRoot()
```

8 实现了 component 然后添加一个常量 TAG_CLASS; 然后支持类组件； 怎么写呢

找一下 beginWork 函数； 添加一个类组件的 fiber 添加一个 else if (currentFiber.tag === TAG_CLASS) {
updateClassComponent(currentFiber)
}

9 声明 updateClassComponent 函数

```
updateClassComponent(currentFiber) {
  if(!currentFiber.stateNode) {// 此类组件 stateNode 组件的实例
  // new ClassCounter()
这里没有声明类组件的props 所以区声明一下 然后用一下
  currentFiber.stateNode = new currentFiber.type(currentFiber.props)
  // 做一个关联  类组件和fiber双向指向

  currentFiber.stateNode.internalFiber = currentFiber;

  // 声明更新队列 然后更新队列
  currentFiber.updateQueue = new UpdateQueue()

  // 走更新逻辑 因为没有stateNode 所以肯定走不进来

  }
  // 给组件的实例的state 赋值
  currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(currentFiber.stateNode.state // 旧的state);
  // 然后重新渲染 走更新逻辑
  // 然后拿到实例调用render方法
  新元素
  let newElement = currentFiber.stateNode.render();

  const newChildren = [newElement];

  这儿可以做的更严谨一些 因为newElement可能是一个数组 就算返回一个数组 也只有一个元素 所以做成数组

  reconcileChildren(currentFiber,newChildren)
}
```

10 然后写 reconcileChildren

```
再while循环里面添加
else if(newChild && typeof newChild === 'function' && newChild.type.prototype.isReactCompoent) {
  tag = TAG_CLASS
}

然后在 if(oldFiber.alternate) {
  newFiber = {
    添加
    updateQueue: oldFiber.updateQueue || new UpdateQueue()
  }
}

新fiber里面肯定是新的

updateQueue: new UpdateQueue()

在 renconcileChildren里面清空老的fiber的effect

if(oldFiber) {
  oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
}
然后将class那个图
修改挂载逻辑 要挂在counter父元素上
在commitWork里面修改

let returnFiber = currentFiber.return;
后面修改
要找他的父亲

// 一直往上找
while([TAG_HOST,TAG_ROOT,TAG_TEXT].includes(currentFiber.tag)) {
  returnFiber = returnFiber.return;
}

增加也要判断

if(currentFiber.effectTag === PLACEMENT) {
  let nextFiber = currentFiber;
  // 如果要挂载的节点不是DOM节点 比如说是类组件fiber,一直找 找到第一个儿子，直到找到一个真实的DOM节点为止
  while(nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT ) {
    nextFiber = currentFiber.child;
  }
}

删除逻辑也要修改

在else if(currentFiber.effectTag === DELETION) {
  注释掉domReturn.removeChild
  新增 commitDeletion(currentFiber,domReturn)
}

声明commitDeltetion函数

function commitDeletion(currentFiber,domReturn) {
  if(currentFiber.tag === TAG_HOST && currentFiber.tag === TAG_TEXT) {
    domReturn.remoeChild(currentFiber.stateNode)
  } else {
    如果是类组件 递归
commitDeletion（currentFiber.child, domReturn)
  }

 23行报错了 因为类组件没有传参数
 schedule里面没有rootFiber
 在每个else if里面加
 if(currentRoot && currentRoot.alternate) {
   workInProgressRoot = currentRoot.alternate;
   workInProgressRoot.alternate = currentRoot
   1 if(rootFiber) {
    workInProgressRoot.props = rootFiber.props
  }
} else if(currentRoot) {
  if(rootFiber) {
   2 rootFiber.alternate = currentRoot;
    workInProgressRoot = rootFiber
  } else {
   3 workInProgress = {
      ...currentRoot,
      alternate: currentRoot
    }
  }
}

然后调试 结果死循环了

因为在updateQueue.js文件里面的forceUpdate里面的while循环少了一行代码
currentUpdate = currentUpdate.nextUpdate


然后调试又报错了 dom.setAttribute不是一个函数

要在调用commitDeletion函数处添加return

在updateDom()函数里面 添加判断
if(stateNode && stateNode.setAttribute) {
  setProps()
}
```
