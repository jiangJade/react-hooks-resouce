import { TAG_ROOT } from './constants';
import { PLACEMENT } from './three/constants';

let workInProgressRoot = null; // 根fiber
let nextUnitOfWork = null; // 下一个工作单元

/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * diff阶段 对比新旧的虚拟dom 进行增量 更新或者创建 render阶段
 * 这个阶段比较花时间 我们可以对任务进行拆分 拆分的维度虚拟DOM 此阶段可以暂停
 * render阶段成果是effect list知道那些节点更新那些节点删除了，那些节点增加了
 * render阶段有两个任务1 根据虚拟DOM生成fiber树 2 收集effectlist
 * commit 阶段 进行DOM更新创建阶段 此阶段不能暂停 要一气呵成
 */
export function scheduler(rootFiber) {
  nextUnitOfWork = rootFiber;
  workInProgressRoot = rootFiber;
}

// 工作循环
function workLoop(deadline) {
  let shouldYeild = false;
  while (nextUnitOfWork && shouldYeild) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYeild = deadline.timeRemaining() < 1; // 没有时间就不执行render
  }
  if (!nextUnitOfWork) {
    console.log('render阶段结束');
  }

  // 检查是否有任务需要执行
  requestIdleCallback(workLoop, { timeout: 500 });
}

function performUnitOfWork(currentFiber) {
  beginWork(currentFiber); // 开始工作
}

/**
 *根据虚拟DOM生成对应fiber节点
 生成真实DOM节点
 *
 * @param {*} currentFiber
 */
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    // 2这里忘记了怎么写
    //  { tag: TAG_ROOT, // 这里写错了 写成了type 应该是tag stateNode: container,props: { children: [element] },}
    updateHostRoot(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

// 创建子fiber 复用旧的fibr节点
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  let tag;
  let prevSibling; // 上一个fiber

  while (newChildIndex < newChildren.length) {
    const newChild = newChildren[newChildIndex];
    // newChild 是A1
    if (newChild && typeof newChild.type === 'string') {
      tag = TAG_ROOT;
    }
    let newFiber = {
      tag, // 4这里写成了TAG_ROOT
      type: newChild.type, // div span text
      props: newChild.props,
      stateNode: null, // 还没有创建真实DOM
      return: currentFiber, // 让新的fiber的return 属性指向当前fiber
      effectTag: PLACEMENT, // 副作用标识
      nextEffect: null,
    };
    // 5这里没有用newChildIndex === 0 做判断
    if (newChildIndex === 0) {
      // 这时后的currentFiber是root div
      currentFiber.child = newFiber; // newFiber是id为A1的div
    } else {
      prevSibling.sibling = newFiber; // newFiber是对象 对象的指针会被改变
    }
    prevSibling = newFiber;
    newChildIndex++;
  }
}

// 1这里写了之后忘记声明workInProgressRoot
requestIdleCallback(workLoop, { timeout: 500 });
