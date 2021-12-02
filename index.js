import React from './react';
import ReactDOM from './react-dom';

// 第一步实现的
// // 虚拟DOM就是一个js对象
// const styles = { border: 'solid 10px red', margin: '5px' };

// let element = (
//   <div id='A1' style={styles}>
//     A1
//     <div id='B1' style={styles}>
//       B1
//       <div id='C1' style={styles}>
//         C1
//       </div>
//       <div id='C2' style={styles}>
//         C2
//       </div>
//     </div>
//     <div id='B2' style={styles}>
//       B2
//     </div>
//   </div>
// );

// console.log(element, 22222222);
// ReactDOM.render(element, document.getElementById('root'));
// let render2 = document.getElementById('render2');

// render2.addEventListener('click', () => {
//   let element2 = (
//     <div id='A1-new' style={styles}>
//       A1-new
//       <div id='B1-new' style={styles}>
//         B1-new
//         <div id='C1-new' style={styles}>
//           C1-new
//         </div>
//         <div id='C2-new' style={styles}>
//           C2-new
//         </div>
//       </div>
//       <div id='B2-new' style={styles}>
//         B2-new
//       </div>
//       <div id='B3' style={styles}>
//         B3-new
//       </div>
//     </div>
//   );
//   ReactDOM.render(element2, document.getElementById('render2'));
// });
// let render3 = document.getElementById('render3');
// render3.addEventListener('click', () => {
//   let element3 = (
//     <div id='A1-new' style={styles}>
//       A2-new
//       <div id='B1-new' style={styles}>
//         B2-new
//         <div id='C1-new' style={styles}>
//           C2-new
//         </div>
//         <div id='C2-new' style={styles}>
//           C2-new
//         </div>
//       </div>
//       <div id='B2-new' style={styles}>
//         B3-new
//       </div>
//       <div id='B3' style={styles}>
//         B3-new
//       </div>
//     </div>
//   );
//   ReactDOM.render(element3, document.getElementById('render3'));
// });

// hooks实现
const ADD = 'ADD';
function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { count: state.count + 1 };
    default:
      return state;
  }
}

function FunctionCounter() {
  const [countState, dispath] = React.useReducer(reducer, { count: 2 });
  const [numberState, setNumber] = React.useState({ count: 0 });

  const add = () => {
    setNumber({ count: numberState.count + 1 });
  };
  return (
    <div>
      <div id='counter3' style={{ margin: '30px' }}>
        <span>{numberState.count}</span>
        <button onClick={add}>加15555555555555</button>
      </div>
      <div id='counter4'>
        <span>{countState.count}</span>
        <button onClick={() => dispath({ type: ADD })}>加1</button>
      </div>
    </div>
  );
}
ReactDOM.render(
  <FunctionCounter name='计算器' />,
  document.getElementById('root')
);
