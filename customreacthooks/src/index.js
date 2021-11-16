import React from './react';
import ReactDom from './react-dom';
import { ADD } from './constants';

// const style = { border: 'solid 2px red', margin: '20px' };
// const Element = (
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
//       <div id='D2' style={style}>
//         D2
//       </div>
//     </div>
//   </div>
// );

// // ReactDom.render(Element, document.getElementById('root'));

// const render2 = document.getElementById('render2');

// render2.addEventListener('click', () => {
//   const element2 = (
//     <div id='A1-new' style={style}>
//       A1-new
//       <div id='B1-new' style={style}>
//         B1-new
//         <div id='C1-new' style={style}>
//           C1-new
//         </div>
//         <div id='C2-new' style={style}>
//           C2-new
//         </div>
//       </div>
//       <div id='B2-new' style={style}>
//         B2-new
//         <div id='D1-new' style={style}>
//           D1-new
//         </div>
//         <div id='D2-new' style={style}>
//           D2-new
//         </div>
//         <div id='D3-new' style={style}>
//           D3-new
//         </div>
//       </div>
//     </div>
//   );
//   ReactDom.render(element2, document.getElementById('root'));
// });
// const render3 = document.getElementById('render3');

// render3.addEventListener('click', () => {
//   const element3 = (
//     <div id='A1-new' style={style}>
//       A1-new
//       <div id='B1-new' style={style}>
//         B1-new
//         <div id='C1-new' style={style}>
//           C1-new
//         </div>
//         <div id='C2-new' style={style}>
//           C2-new
//         </div>
//       </div>
//       <div id='B2-new' style={style}>
//         B2-new
//         <div id='D1-new' style={style}>
//           D1-new
//         </div>
//         <div id='D2-new' style={style}>
//           D2-new
//         </div>
//       </div>
//     </div>
//   );
//   ReactDom.render(element3, document.getElementById('root'));
// });

function reducer(state, action) {
  switch (action.type) {
    case ADD:
      return { number: state.number + 1 };
    default:
      return state;
  }
}

function FunctionComponent() {
  const [number, dispatch] = React.useReducer(reducer, { number: 1 });
  return (
    <div>
      <span>{number.number}</span>
      <button onClick={() => dispatch({ type: ADD })}>加1</button>
    </div>
  );
}

ReactDom.render(
  <FunctionComponent name='计数器' />,
  document.getElementById('root')
);
