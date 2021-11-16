## 实现思路

/\*\*

- 从根节点开始渲染和调度
- 两个阶段
- 1.render 阶段: 根据 diff 算法对比新旧的虚拟 dom 进行增量 更新或者创建
- 这个阶段比较花时间 我们可以对任务进行拆分 拆分的维度虚拟 DOM 此阶段可以暂停
- render 阶段有两个任务; 1 根据虚拟 DOM 生成 fiber 树; 2 收集 effect list
- render 阶段成果是 effect list 知道那些节点更新那些节点删除了，那些节点增加了
-
- 2.commit 阶段 进行 DOM 更新创建阶段 此阶段不能暂停 要一气呵成
  \*/

1 schedule 函数,并说明该函数的作用 举例为什么可以中断 diff 就是 render 阶段
该函数有三个作用
一 接收 rootFiber 参数
二 将 rootFiber 赋值给 nextUnitOfWork (下一个工作单元)

2 链表需要遍历 所以有一个遍历函数 workLoop
该函数有 5 个作用
使用 while 循环遍历 nextUnitOfWork
三 将 performUnitOfWork 结果赋值给 nextUnitOfWork,同时检查是否还有剩余执行时间

在最外面声明这个函数 requestIdleCallback(workLoop,{timeout: 500})

四 声明 shouldYeild 并赋值
五 requestIdleCallback 如果没有时间片 到期后还有任务没有完成 就需要请求浏览器再次调度
六 不管有没有任务 都请求再次调度 每一帧都要执行一次 workLoop

3 声明 workInProgressRoot 需要一个指针指向 rootFiber; 方便寻找根元素

4 声明 preformUnitOfWork 函数
一 接收 currentFiber 参数
二 调用 beginWork，并且接收 currentFiber 参数

5 声明 beginWork（这里只有儿子 开始收下线的钱，1 创建真实 DOM；2 创建子 fiber;) 函数，接收 currentFiber;该函数通过判断 currentFiber.tag 类型调用不同函数；
tag 类型有 TAG_ROOT 对应 updateHostRoot

6 声明 updateHostRoot; updateHostRoot 接收 currentFiber 参数，
取出 newChildren = currentFiber.props.children; // [element <div id="A1">];
// 先处理自己 因为第一个是一个原生节点
调用 reconcileChildren(currentFiber, newChildren)

7 声明 reconcileChildren 函数,reconcileChildren 函数将虚拟 DOM 转换成 Fiber
newChildren 是一个数组。
function reconcileChildren(currentFiber, newChildren) {
一 声明 newChildIndex = 0; // 新子节点的索引
声明一个新的子 newFiber，prevSibling
二
// 循环终止条件是新子节点索引大于 newChildren.length
while(newChildIndex < newChildren.length) {}
三 newChildIndex++;
四 取出虚拟 DOM 节点，let newChild = newChildren[newChildIndex];
声明一个 tag 变量，用来区分 fiber 节点类型；let tag;
newChild.type 类型判断虚拟 DOM 类型 并且赋值给 tag；

```
  if(newChild.type === ELEMENT_TEXT) {
    tag = TAG_TEXT // 文本节点
  }else if(newChild.type === 'string') {
    tag = TAG_HOST // 原生 DOM 节点 div span p
  }
  // beginWork 创建 Fiber; 在 completeUnitOfWork 收集 effect list

  let newFiber = {
    tag,
    type: newChild.type,
    props: newChild.props,
    stateNode: null, // div 还没有创建 DOM 元素 原生节点
    return: currentFiber,
    effectTag: PLACEMENT, // 有这个的就是出钱的 副作用标识 render 阶段我们需要收集副作用 增加 删除 更新
    nextEffect:null, // effect list 也是一个单链表
    // effect list 顺序和完成顺序是一样的，但是节点只放那些出钱的人的 fiber 节点，不出钱的绕过去
  }
```

这里要用 effectList 那张图说明一下 红线是副作用 解释一下流程
///////////////////////////

```
判断是否存在 fiber
  if(newFiber) {
    如果当前索引为 0 说明这是太子
    if(newChildIndex === 0) {
      currentFiber.child = newFiber;
    } else {
      // 让太子的 sibling 属性指向二皇子
      // 解答 因为 newChildIndex 为 1 的时候 才会走这一步
      prevSibling.sibling = newFiber;
    }
      prevSibling = newFiber;
    }
      newChildrenIndex++;
  }
```

8 在 performUnitOfWork 函数中判断 currentFiber 是否有儿子有儿子就返回； 然后再循环中完成自己
没有儿子就找兄都
没有儿子和兄都就找叔叔

9 声明 updateHostText 函数
接收 currentFiber 参数，判断此 fiber 是否已创建 DOM 节点(!currentFiber.stateNode)，为创建则调用 createDOM 函数, 并赋值
currentFiber.stateNode = createDOM(currentFiber);

10 声明 createDOM 函数 接收 currentFiber 参数
判断 tag 类型

```
  switch(currentFiber.tag) {
    case TAG_TEXT:
      return document.createTextNode(currentFiber.props.text);
    case TAG_HOST:
      let stateNode = document.createElement(currentFiber.type) // div span
      updateDOM(stateNode,{},currentFiber.props);
      return stateNode;
  }

```

// 声明 updateDOM 函数 接收三个参数

```
  function updateDOM(stateNode, oldProps, newProps) {
    if(sateNode?.setAttribute) {
      setProps(stateNode,oldProps,newProps)
    }
  }
```

11 创建 utils 文件

12 updateHost 函数接收 currentFiber 参数
判断当前 currentFiber 是否存在 stateNode,如果不存在调用 createDOM 函数，并将结果赋值给 currentFiber.stateNode; 然后取出 newChildren = currentFiber.props.children;
reconcileChildren(currentFiber,newChildren);

12 completeUnitOfWork 完成的时候要收集有副作用的 fiber 然后组成 effect list; 每个 fiber 有两个属性 firstEffect 指向第一个有副作用的 fiber lastEffect 指向最后一个有副作用子 fiber; 中间的用 nextEffect 做成一个单链表 firstEffect = 大儿子.nextEffect 二儿子.nextEffect 三儿子 lastEffect

```
一 先取出父 fiber; let returnFiber = currentFiber.return;
二步 找副作用
  let effectTag = currentFiber.effectTag;
  if(effectTag) { // 有副作用才收集
    if(returnFiber) {
      // A1 完成 将父节点的 firstEffect 和 lastEffect 指向 A1
    if(returnFiber.lastEffect) {
      returnFiber.lastEffect.nextEffect = currentFiber
    } else {
      returnFiber.firstEffect = currentFiber;
    }
      returnFiber.lastEffect = currentFiber;
    }
  }
```

三步

13 render 阶段结束 调用 commitRoot 函数

该函数取出 let currentFiber = workInProgressRoot.firstEffect;

```
  while(currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect
  }
  workInProgressRoot = null;
```

14 commitWork 函数接收 currentFiber;如果不是 currentFiber return 中断提交工作
取出 returnFiber,取出 returnDOM；判断是否是新增，currentFiber.effectTag === PLACEMENT; returnDOM.appendChild(currentFiber.stateNode);

current.effectTag = null

requestIdleCallback(workLoop,{timeout: 500})

```

三 判断是否有 child 节点类型 有就返回该节点节点
四 用 while 遍历 currentFiber,调用 completeUnitOfWork 函数传入 currentFiber(没有儿子让自己完成);然后看看有没有弟弟，有弟弟 返回弟弟
```
