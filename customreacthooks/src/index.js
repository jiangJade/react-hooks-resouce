import React from './react';
import ReactDom from './react-dom';
import { ADD } from './constants';

function FunctionComponent() {
  const reducer = (state, action) => {
    switch (action.type) {
      case ADD:
        return { count: state.count + 1 };
      default:
        return state;
    }
  };
  const [currentState, dispatch] = React.useReducer(reducer, { count: 0 });
  console.log(currentState, '');
  return (
    <div>
      <span>{currentState.count}</span>
      <button onClick={() => dispatch({ type: ADD })}>计数器</button>
    </div>
  );
}

ReactDom.render(
  <FunctionComponent name='计数器' />,
  document.getElementById('root')
);
