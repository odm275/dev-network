import { GET_ERRORS, CLEAR_ERRORS } from "../actions/types";

//payload is already coming from the axios call;
//reducer here just lets it flow.
const initialState = {};

export default function(state = initialState, action) {
  switch (action.type) {
    case CLEAR_ERRORS:
      return {};
    case GET_ERRORS:
      return action.payload;
    default:
      return state;
  }
}
