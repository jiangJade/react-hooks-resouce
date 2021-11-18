import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_HOST,
  TAG_TEXT,
  DELETION,
  UPDATE,
  PLACEMENT,
  TAG_CLASS,
  TAG_FUNCTION_COMPONENT,
} from './constants';
import { setProps } from './utils';
import { UpdateQueue } from './updateQueue';
/*
    alternate 是候补 替补的意思
    从根结点开始渲染和调度
    两个阶段
    diff阶段 对比新旧的虚拟DOM，进行增量 更新或者创建 render 阶段
    这个阶段可能比较花时间 可以对我们的任务进行拆分 拆分的维度虚拟DOM。此阶段可以暂停
    render 阶段成果是Effect list 知道那些节点更新 那些节点删除 那些节点增加
    render阶段有两个任务 1.根据虚拟DOM生成Fiber树 2.收集effectlist
    commit 阶段，进行DOM更新创建阶段，此阶段不能暂停，要一气呵成
*/
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; //正在渲染的根
let currentRoot = null; // 渲染成功之前的树
let deletions = []; // 删除的节点我们并不放在effect list里 ，所以要单独记住
export function scheduleRoot(rootFiber) {
  //rootFiber里面有 { tag: TAG_ROOT, stateNode: container,  props: { children: [element]}}
  if (currentRoot && currentRoot.alternate) {
    // 第二次之后的更新
    // 第一次渲染出来的那个fiber tree 准备复用
    workInProgressRoot = currentRoot.alternate;

    // 让这个树的替身指向当前的currentRoot
    workInProgressRoot.alternate = currentRoot;
    // 让他的props更新成新的props  因为rootFiber可能传也可能不传
    if (rootFiber) workInProgressRoot.props = rootFiber.props;
    // 有值说明渲染过一次
  } else if (currentRoot) {
    if (rootFiber) {
      rootFiber.alternate = currentRoot;
      workInProgressRoot = rootFiber;
    } else {
      // 如果没传 rootFiber
      workInProgressRoot = {
        ...currentRoot,
        alternate: currentRoot,
      };
    }
  } else {
    // 如果是第一次渲染
    workInProgressRoot = rootFiber;
  }

  // 清空指针
  workInProgressRoot.firstEffect =
    workInProgressRoot.lastEffect =
    workInProgressRoot.nextEffect =
      null;
  nextUnitOfWork = workInProgressRoot;
}

function preformUnitOfWork(currentFiber) {
  beginWork(currentFiber); // 开始
  if (currentFiber.child) {
    return currentFiber.child;
  }
  while (currentFiber) {
    // 没有儿子 让自己完成
    completeUnitOfWork(currentFiber);
    // 看有没有弟弟  有弟弟返回弟弟
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    // 找父亲 然后让父亲完成
    currentFiber = currentFiber.return;
  }
}

// 完成 收集有副作用的fiber 然后组成effect list
// 每个fiber有两个属性 firstEffect指向第一个有副作用的子fiber
// lastEffect 指向最后一个有副作用的子fiber
// 中间用nextEffect 做成一个单链表 firstEffect = 大儿子.nextEffect二儿子.nextEffect三儿子
function completeUnitOfWork(currentFiber) {
  // returnFiber 父元素
  let returnFiber = currentFiber.return; // 第一个完成的是A1（text)
  // 判断有没有爹
  if (returnFiber) {
    //// 把自己儿子的effect链挂到父亲身上
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    // 执行到C1文本节点完成后 C1文本节点 的return 指向C1 div
    // 上面儿子完成让自己完成 很重要 所以C1文本节点完成后没有儿子 C1 div 要自己完成
    // 这时候执行C1 div, C1 div 的firstEffect 和 lastEffect 都指向 C1文本节点
    // 所以将 这儿C1 div 的父亲是B1 div 将B1 div 的nextEffect 指向C1 div
    // C1 执行完了 就继续执行他的兄弟 C2
    // C2 执行完了那么 继续完成B1自己 将自己指向指向A1
    if (!!currentFiber.lastEffect) {
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    //////////////////////////// 这是最开始执行的 也就是第一次开始
    // 把自己挂到父亲上
    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      // 说明有副作用 第一次新增 肯定有副作用 A1 first last = A1(Text)

      // 执行B2时A1已经有了 lastEffect 所以将A1的lastEffect.nextEffect
      // 指向B2
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      // 最开始所有的 firstEffect  和 lastEffect 都为空
      // 第一次是 A1得文本节点完成 returnFiber是DIVA1
      // 所以让div A1的firstEffect和lastEffect 指向A1的文本节点
      // returnFiber.firstEffect = currentFiber; 写的bug只渲染除了一个节点 其他都没有渲染出来
      returnFiber.lastEffect = currentFiber;
    }
  }
}

/*
*beginWork开始收下线的钱
completeUnitOfWork
1.创建真实DOM元素  真是DOM是指 div span p 这些 标签
*/
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    // 根Fiber
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    // 文本节点
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    // 原始DOM节点
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_CLASS) {
    // 类组件
    updateClassComponent(currentFiber);
  } else if (currentFiber.tag === TAG_FUNCTION_COMPONENT) {
    // 类组件
    updateFunctionComponent(currentFiber);
  }
}

// 更新函数组件
function updateFunctionComponent(currentFiber) {
  const newChildren = [currentFiber.type(currentFiber.props)];
  reconcileChildren(currentFiber, newChildren);
}

// 更新类组件
function updateClassComponent(currentFiber) {
  if (!currentFiber.stateNode) {
    // 类组件 stateNode组件的实例
    // type 是 new ClassCounter(); 类组件和实例 fiber双向指向
    currentFiber.stateNode = new currentFiber.type(currentFiber.props);
    currentFiber.stateNode.internalFiber = currentFiber;
    currentFiber.updateQueue = new UpdateQueue();
  }
  // 给组件的实例的state 赋值
  currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(
    currentFiber.stateNode.state
  );
  let newElement = currentFiber.stateNode.render();
  const newChildren = [newElement];
  reconcileChildren(currentFiber, newChildren);
}

function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    // 如果此fiber没有创建DOM
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

// 创建DOM
function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
    // 如果是真实DOM div span
  } else if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

// 更新DOM
function updateDOM(stateNode, oldProps, newProps) {
  // 如果是类组件就不需要走更新逻辑
  if (stateNode.setAttribute) setProps(stateNode, oldProps, newProps);
}

// 更新文本
function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    // 如果没有元素DOM 创建DOM元素
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

// 更新根节点
function updateHostRoot(currentFiber) {
  // 1.先处理自己 如果是一个原生节点, 创建真是DOM节点
  // 2。 创建子fiber
  let newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

// newChildren是一个虚拟DOM的数组  把虚拟DOM转换成Fiber节点
function reconcileChildren(currentFiber, newChildren) {
  // [A1]
  let newChildIndex = 0; // 新子节点的索
  // 如果当前Fiber有alternate 并且有child 至少渲染过一次才会有值
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  // 清空effect 不然指针会有问题
  if (oldFiber)
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  let prevSibling; // 上一个新的子fiber
  // 遍历我们的子虚拟DOM元素数组 为每个虚拟DOM元素创建Fiber
  // 一次遍历完两个Fiber
  while (newChildIndex < newChildren.length || oldFiber) {
    let newChild = newChildren[newChildIndex];
    let newFiber; // 新的Fiber
    // 老的Fiber和新的newChild还在 两个类型相同 比如 都为div  或者都为span
    const sameType = oldFiber && newChild && oldFiber.type === newChild.type;

    let tag;
    if (
      newChild &&
      typeof newChild.type === 'function' &&
      newChild.type.prototype.isReactComponent
    ) {
      tag = TAG_CLASS; // 类组件
    } else if (newChild && typeof newChild.type === 'function') {
      tag = TAG_FUNCTION_COMPONENT; // 这是一个函数组件
    } else if (newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 这是一个文本节点
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST; // 如果type是字符串，那么这是一个原生DOM节点 'A1' div
    }
    // 为true说明老的Fiber和新虚拟DOM类型一样，可以复用老的DOM节点，更新即可
    if (sameType) {
      if (oldFiber.alternate) {
        // 说明至少已经更新过一次
        newFiber = oldFiber.alternate; // 如果有上上次的fiber就拿过来作为这一次的fiber
        newFiber.props = newChild.props;
        newFiber.alternate = oldFiber;
        newFiber.effectTag = UPDATE;
        newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
        newFiber.nextEffect = null;
      } else {
        newFiber = {
          tag: oldFiber.tag, // TAG_HOST
          type: oldFiber.type, // div
          props: newChild.props, //
          stateNode: oldFiber.stateNode, // div还没有创建DOM元素
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
          return: currentFiber, // 父Fiber returnFiber
          alternate: oldFiber, // 让新Fiber的 alternate 指向老的节点
          effectTag: UPDATE, // 副作用标识 render我们要收集副作用 新增 修改 删除
          nextEffect: null,
        };
      }
    } else {
      // 一一对比 没有做Diff优化 比如key
      // 判断是否存在 可能为null 比如A1的文本为null 不为空才创建Fiber
      if (newChild) {
        // beginWork 创建fiber 在completeUnitOfWork 的时候收集effect
        newFiber = {
          tag, // TAG_HOST
          type: newChild.type, // div
          props: newChild.props,
          stateNode: null, // div还没有创建DOM元素
          return: currentFiber, // 父元素
          updateQueue: new UpdateQueue(),
          effectTag: PLACEMENT, // 副作用标识 render我们要收集副作用 新增 修改 删除
          nextEffect: null,
          // effect list 也是一个单链表  完成顺序是一样的 但是节点只放那些出钱得人得fiber节点
        };
      }
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }
    // 老Fiber的是一个链表
    // 新的Fiber是一个虚拟DOM数组
    if (oldFiber) {
      oldFiber = oldFiber.sibling; // oldFiber指针向后移动一次
    }
    // 最小的儿子没有弟弟
    if (newFiber) {
      if (newChildIndex === 0) {
        // 如果当前的索引为0 说明是太子 大儿子也就是B1
        currentFiber.child = newFiber;
      } else {
        // 让太子的sibling弟弟指向二皇子
        prevSibling.sibling = newFiber;
      }

      prevSibling = newFiber;
    }
    newChildIndex++;
  }
}

// 循环执行工作 nextUnitOfWork
function workLoop(deadline) {
  let shouldYield = false; // 是否要让出时间片或者控制权
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = preformUnitOfWork(nextUnitOfWork);

    shouldYield = deadline.timeRemaining() < 1; // 没有时间的话就要让出控制权 1得单位是毫秒
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }
  // 如果时间片到期还有任务没有完成，就需要请求浏览器再次调度
  // 每一帧都要执行一次workLook
  requestIdleCallback(workLoop, { timeout: 500 });
}

// 提交
function commitRoot() {
  deletions.forEach(commitWork); // 执行effect list前 把改删除的元素 删除掉
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    console.log('commitRoot', workInProgressRoot, currentFiber.type);

    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  deletions.length = 0; // 提交之后清空 deletions数组
  currentRoot = workInProgressRoot; // 把当前渲染成功的根fiber 赋给currentRoot
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return; //
  // 找DOM父元素 如果不是DOM节点
  while (
    returnFiber.tag !== TAG_HOST &&
    returnFiber.tag !== TAG_ROOT &&
    returnFiber.tag !== TAG_TEXT
  ) {
    returnFiber = returnFiber.return;
  }
  let domReturn = returnFiber.stateNode;
  // 新增
  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    // 如果是class 直接返回 不再添加DOM节点
    if (nextFiber.tag === TAG_CLASS) {
      return;
    }
    // 如果要挂载的节点不是DOM节点，比如说是类组件fiber 一直找第一个儿子 直到找到真是DOM节点为止
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = currentFiber.child;
    }
    // appendChild 会自动去重
    domReturn.appendChild(nextFiber.stateNode);
    // 删除
  } else if (currentFiber.effectTag === DELETION) {
    return commitDeletion(currentFiber, domReturn); // 删除节点
    // domReturn.removeChild(currentFiber.stateNode)
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      // 不相等再更新内容 currentFiber.alternate 上一次的fiber
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text; // 更新老文本的内容
      } else {
        updateDOM(
          currentFiber.stateNode,
          currentFiber.alternate.props,
          currentFiber.props
        );
      }
    }
  }
  currentFiber.effectTag = null;
}

function commitDeletion(currentFiber, domReturn) {
  if (currentFiber.tag == TAG_HOST || currentFiber.tag == TAG_TEXT) {
    domReturn.removeChild(currentFiber.stateNode);
  } else {
    commitDeletion(currentFiber.child, domReturn);
  }
}

// React 告诉浏览器 我现在有任务请你在闲的时候执行workLoop 如果超过500毫秒 还没有时间 必须执行
// 这里有一个优先级的概念 expirationTime 很复杂
requestIdleCallback(workLoop, { timeout: 500 });
