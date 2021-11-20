UPDATE render2 按钮实现逻辑

实现逻辑

一 小回忆下 index 文件的 dom 结构，然后讲解一下 react-dom 文件内容 和执行流程； 然后讲解一下 scheduler 文件的 schedule 执行流程

二 讲更新 1.在 public 里面加两个按钮。

2. 在 index 文件里面获取 render2 和 render3 按钮 添加 element2 和 element3 使用

```
render2.addEventListener('click',() => {
  let element2 =(

  )
})
```

3. 在 scheduler 里面文件顶部声明 currentRoot 变量； 然后在 commitRoot 里面将 workInProgressRoot（正在渲染的根）赋值给 currentRoot（渲染成功的树）; currentRoot = workInProgressRoot;

4. 讲解更新的那张图 就是 workInProgressRoot 对应 currentRoot 节点的图；以及双缓冲的那张图

5 在 schedule 这里修改 将 nextUnitOfWork = workInProgressRoot;
if(currentRoot) {
rootFiber.alternate = currentRoot;
workInProgressRoot = rootFiber
} else {
workInProgressRoot = rootFiber
}

6 增加一个数组 deletions // 删除的节点要单独记录 没有放在 effect list ；然后在 commitRoot 里面的第一行添加 deletions.forEach(commitWork); // 执行 effect list 先把该删除的元素删除；在 while 循环下面 deletions.length = 0;清空该数组；
commitWork 里面添加
if(currentFiber.effectTag === PLACEMENT) {
domReturn.appendChild(currentFiber.stateNode)
} else if(currentFiber.effectTag === DELETION) {
domReturn.removeChild(currentFiber.stateNode)
}else if(currentFiber.effectTag === UPDATE) {
if(currentFiber.type === ELEMENT_TEXT) {
if(currentFiber.alternate.props.text !== currentFiber.props.text) { // 用老的和新的对比 拿出那张图讲解 然后再讲解 setProps 函数处理旧的 props
currentFiber.stateNode.textContent = currentFiber.props.text;
} else{
updateDOM(currentFiber.stateNode,currentFiber.alternate.props,currentFiber.props)
}
}
}

7 重头戏 新旧 fiber 对比再 reconcileChildren 里面

声明 let oldFiber = currentFiber.alternate && currentFiber.alternate.child; // 第一次 oldFiber 为 null

先判断类型 在 while 判断加参数加 || oldFiber;就是 newChildIndex < newChildren.lenght || oldFiber

在 newChild 下面声明一个 newFiber(虽然之前有一个)；

const sameType = oldFiber && newChild && oldFiber.type === newChild.type; // 如果类型一样就可以复用

在之前的 let newFiber 对象上面一行

```
if(sameType) { // 说明老 fiber 和新虚拟 DOM 类型一样，可以复用老的 DOM 节点,更新即可
  newFiber = {
    tag: oldFiber.tag, // 新老都可以 一样的 TAG_HOST
    type:oldFiber.type, // div
    props: newFiber.props, // 用新的 props
    stateNode:oldFiber.stateNode, //
    return: currentFiber, // 父 fiber returnFiber
    alternate:oldFiber, // 让新的 fiber 的 alternate 指向老的 fiber 节点
    effectTag: UPDATE, // 副作用标识
    nextEffect: null, // effect list 也是一个单链表
  }
} else { // 不一样
  newFiber = {
      tag,
      type: newChild.type,
      props: newChild.props,
      stateNode: null, // 还未生成真实DOM 原生节点
      effectTag: PLACEMENT,
      nextEffect: null, // effect list 收集副作用
      return: currentFiber,
    };
}
```

8 遍历完了要移动指针，讲解指针移动 newChildIndex 逻辑
然后画图

判断一下 oldFiber 指针也要移动
if(oldFiber) {
oldFiber = oldFiber.sibling; //
}

在 7 的 else 里面加判断 因为 dom 里面可能加一个 null 所以要判断

```
  if(newChild) {
     newFiber = {
      tag,
      type: newChild.type,
      props: newChild.props,
      stateNode: null, // 还未生成真实DOM 原生节点
      effectTag: PLACEMENT,
      nextEffect: null, // effect list 收集副作用
      return: currentFiber,
    };
  }
有可能新的比老的节点多 也可能比老的少  这里直接干掉 不做key的讲解
```

然后打开浏览器 点击 render2 成功 点击 render3 会报错（因为 D3dom 节点被干掉了，为 null 了）
所以要加一个判断 在

```
if(newChild && newChild.type === ELEMENT_TEXT) {
  tag = TAG_TEXT
} else if(newChild && typeof newChild.type === 'string) {
  tag = TAG_HOST
}
这里添加了newChild存在的判断

```

讲一下双缓冲机制的由来，优化实现 fiber 树；不用每次都创建新的 fiber；
A/B A/B 切换 第一次有一个 A 树 第二次有一个 B 树 第三次不创建新的树；复用 A 树

二 添加双缓存机制

1 schedule 里面添加

```
  1 if(currentRoot && currentRoot.alternate) { // 第二次后的更新
    // 第一次渲染出来的那个fiber tree
    workInProgressRoot = currentRoot.alternate;

    3 workInProgressRoot.props = rootFiber.props // 让他的props更新成新的props
    4 workInProgressRoot.alternate = currentRoot // 让这棵树的替身指向当前树
  }

  2 在该函数到数第二行添加
  workInProgereeRoot.firstEffect = workInProgereeRoot.lastEffect =workInProgereeRoot.nextEffect =null
```

### 二 没有复用老的 Fiber 树

```
 reconcileChildren 函数的
 if(sameType) { // 老的fiber和新的fiber虚拟DOM一样 可以复用
   if(oldFiber.alternate) { // 说明已经更新过一次
     newFiber = oldFiber.alternate;
     newFiber.props = newChild.props;
     newFiber.alternate = oldFiber;
     newFiber.effectTag = UPDATE;
     newFiber.nextEffect = null;
   }
 }
```
