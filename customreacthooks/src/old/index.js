import React from './react';
import ReactDOM from './react-dom';

// useState 是一个语法糖 他是基于useReducer 实现的
// class ClassCounter extends React.Component {
//     constructor(props) {
//         super(props);
//         this.state = {
//             number: 0
//         }
//     }

//     onClick = () => {
//         this.setState(state => ({ number: state.number + 1 }))
//     }

//     render() {
//         return (
//             <div id="counter">
//                 <span>{this.state.number}</span>
//                 <button onClick={this.onClick} >加1</button>
//             </div>
//         )
//     }
// }

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
  // function f() {
  //     setNumberState((numberState) => ({number: numberState.count + 1}))
  // }
  console.log(numberState, 555555555555);
  return (
    <div>
      <div id='counter3' style={{ margin: '30px' }}>
        <span>{numberState.count}</span>
        <button onClick={add}>加15555555555555</button>
        {/* {f()} */}
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
