/*
    fiber遍历规则
    深度优先
    先儿子，后弟弟再叔叔
*/

let A1 = { type: 'div', key: 'A1' };
let B1 = { type: 'div', key: 'B1', return: A1 };
let B2 = { type: 'div', key: 'B2', return: A1 };
let C1 = { type: 'div', key: 'C1', return: B1 };
let C2 = { type: 'div', key: 'C2', return: B1 };

A1.child = B1;
B1.sibling = B2;
B1.child = C1;
C1.sibling = C2;
function sleep(delay) {
    // 在js里面如何实现睡眠功能 t=当前时间
    for (var start = Date.now(); Date.now() - start <= delay;) {

    }
}


let nextUnitOfWork = null; // 下一个执行单元

let startTime = Date.now();
function workLoop(deadline) {
    // 如果有待执行的执行单元，就执行，然后会返回下一个执行单元
    // while(nextUnitOfWork) { 
    while ((deadline.timeRemaining() > 1 || deadline.didTimeout) && nextUnitOfWork) {
        nextUnitOfWork = preformUnitOfWork(nextUnitOfWork);
    }
    if (!nextUnitOfWork) {
        console.log('render阶段结束');
        console.log(Date.now() - startTime);
    } else {
        requestIdleCallback(workLoop, { timeout: 1000 });
    }
}

function preformUnitOfWork(fiber) {
    beginWork(fiber); // 处理此fiber
    if (fiber.child) { // 如果有儿子，返回大儿子
        return fiber.child;
    }
    // 如果没有儿子，则说明fiber已经完成了
    while (fiber) {
        completeUnitOfWork(fiber);
        if (fiber.sibling) {
            return fiber.sibling; // 如果说有弟弟返回弟弟
        }
        fiber = fiber.return; 
    }
}

function completeUnitOfWork(fiber) {
    console.log('结束', fiber.key); // A1 B1 C1
}

function beginWork(fiber) {
    sleep(20);
    console.log(fiber.key); // A1 B1 C1
}

nextUnitOfWork = A1;

requestIdleCallback(workLoop, { timeout: 1000 });
