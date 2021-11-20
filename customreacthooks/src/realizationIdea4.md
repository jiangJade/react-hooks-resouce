函数组件实现
第一阶段：
1 先声明一个函数组件的 枚举 叫 TAG_FUNCTION_COMPONENT

2 在 index 文件声明

```
  function FunctionComponent(){
    reutrn (
      <div>
        <span></span>
        <div></div>
      </div>
    )
  }
```

3 然后去 scheduler 文件在 beginWork 函数 添加函数组件类型判断
在 beginWork 函数中添加 else if 判断 判断当前的 currentFiber.tag === TAG_FUNCTION_COMPONENT; 然后声明 newChildren;

const newChildren = [currentFiber.type(currentFiber.props)]

再调用 reconcilChildren(currentFiber,newChildren)

4 在 reconcileChildren 添加 tag 类型 加 else if 判断是否存在 newChild && typeof newChild.type === "function"
并将 tag = TAG_FUNCTION_CONMPONENT

然后在

```
  if(oldFiber.alternate) {
    newFiber = {
      添加
      updateQueue: oldFiber.updateQueue || new UpdateQueue()
    }
  }
```

5 声明 updateQueue.js 文件

新 fiber 里面肯定是新的

updateQueue: new UpdateQueue()

在 renconcileChildren 里面清空老的 fiber 的 effect

```
  if(oldFiber) {
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  }
```

然后将 class 那个图
修改挂载逻辑 要挂在 counter 父元素上
在 commitWork 里面修改

let returnFiber = currentFiber.return;
后面修改
要找他的父亲

// 一直往上找

```
  while(![TAG_HOST,TAG_ROOT,TAG_TEXT].includes(currentFiber.tag)) {
    returnFiber = returnFiber.return;
  }
```

增加也要判断

```
  if(currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    // 如果要挂载的节点不是 DOM 节点 比如说是类组件 fiber,一直找 找到第一个儿子，直到找到一个真实的 DOM 节点为止
    while(nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT ) {
      nextFiber = currentFiber.child;
    }
  }
```

删除逻辑也要修改

在 else if(currentFiber.effectTag === DELETION) {
注释掉 domReturn.removeChild
新增 commitDeletion(currentFiber,domReturn)
}

声明 commitDeltetion 函数

```
  function commitDeletion(currentFiber,domReturn) {
    if(currentFiber.tag === TAG_HOST && currentFiber.tag === TAG_TEXT) {
      domReturn.removeChild(currentFiber.stateNode)
    } else {
    如果是类组件 或者函数组件 递归
      commitDeletion(currentFiber.child, domReturn)
  }
```

23 行报错了 因为函数组件没有传参数
schedule 里面没有 rootFiber

```
在每个 else if 里面加
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
      3 workInProgressRoot = {
      ...currentRoot,
      alternate: currentRoot
      }
    }
  }
```

然后调试 结果死循环了

因为在 updateQueue.js 文件里面的 forceUpdate 里面的 while 循环少了一行代码
currentUpdate = currentUpdate.nextUpdate

然后调试又报错了 dom.setAttribute 不是一个函数

要在调用 commitDeletion 函数处添加 return

在 updateDom()函数里面 添加判断
if(stateNode && stateNode.setAttribute) {
setProps()
}

然后看能不能跑起来

//////////////////////////////////////////////////////
第二阶段：

1 声明一个常量 ADD；声明一个 redurce 函数
用 switch 判断

```

  function redurce(state,action) {
    switch(action.type) {
      case ADD:
        return {number: state.number+1}
      default:
        return state
    }
  }

```

在函数组件中解构出[countState,dispatch] = React.useReducer(reducer,{count:0})

2 在 scheduler 文件构建 useReducer
一： 声明两个全局变量 let hookIndex; let workInProgressFiber = null;
二：在 updateFunctionComponent 函数中给这两个变量赋值；hookIndex =0; workInProgressFiber = currentFiber;
workInProgressFiber.hooks = [];
const newChildren=[currentFiber.type(currentFiber.props)]

调用 reconcileChildren(currentFiber,newChildren)
三：声明 useReducer 并导出

```
  export function useReducer(reducer,initialValue) {

  let newHook = workInProgressFiber.alternate && workInProgressFiber.alternate.hooks && workInProgressFiber.alternate.hooks[hookIndex];
    if(newHook) {
      newHook.state = newHook.updateQueue.forceUpdate(newHook.state)
    } else {
      newHook = {
        state: initialValue,
        updateQueue:new UpdateQueue()
      }
    }
  const dispatch = (action) => {
  newHook.updateQueue.enqueueUpdate(
  new Update(reducer? reducer(newHook.state,action) : action)
  )
    scheduleRoot()
  }
    workInProgressFiber.hooks[hookIndex++] = newHook;
    return [newHook.state,dispatch];
  }
```

3 创建 useState 函数

```

export function useState(initialValue) {
useReducer(null,initialValue)
}

```

4 在 react 中引入 useState
