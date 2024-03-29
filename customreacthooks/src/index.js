import React from './react';
import ReactDom from './react-dom';
import { ADD } from './constants';
const style = { border: 'solid 2px red', margin: '20px' };

// let element = (
//   <div id='A1' style={style}>
//     A1
//     <div id='B1' style={style}>
//       B1
//       <div id='C1' style={style}>
//         C1
//       </div>
//       <div id='C2' style={style}>
//         C2
//       </div>
//     </div>
//     <div id='B2' style={style}>
//       B2
//       <div id='D1' style={style}>
//         D1
//       </div>
//     </div>
//   </div>
// );
// ReactDom.render(element, document.getElementById('root'));

// console.log(element);
// let render2 = document.getElementById('render2');
// render2.addEventListener('click', () => {
//   let element2 = (
//     <div id='A1' style={style}>
//       A1-new
//       <div id='B1' style={style}>
//         B1-new
//         <div id='C1' style={style}>
//           C1-new
//         </div>
//         <div id='C2' style={style}>
//           C2-new
//         </div>
//       </div>
//       <div id='B2' style={style}>
//         B2-new
//         <div id='D1' style={style}>
//           D1-new
//         </div>
//       </div>
//     </div>
//   );

//   ReactDom.render(element2, document.getElementById('root'));
// });
// let render3 = document.getElementById('render3');
// render3.addEventListener('click', () => {
//   let element3 = (
//     <div id='A1' style={style}>
//       A1-new-new
//       <div id='B1' style={style}>
//         B1-new-new
//         <div id='C1' style={style}>
//           C1-new-new
//         </div>
//         <div id='C2' style={style}>
//           C2-new-new
//         </div>
//       </div>
//       <div id='B2' style={style}>
//         B2-new-new
//       </div>
//     </div>
//   );

//   ReactDom.render(element3, document.getElementById('root'));
// });

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { count: state.count + 1 };

    default:
      return state;
  }
}

function FunctionComponent() {
  const [conutState, dispatch] = React.useReducer(reducer, { count: 0 });
  return (
    <div id='counter'>
      <span>{conutState.count}</span>
      <button onClick={() => dispatch({ type: 'ADD' })}>计数器</button>
    </div>
  );
}

ReactDom.render(<FunctionComponent />, document.getElementById('root'));
