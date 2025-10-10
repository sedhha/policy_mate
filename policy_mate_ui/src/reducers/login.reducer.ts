import { LoginAction, LoginState } from '@/types';

export const loginState: LoginState = {
  username: '',
  password: '',
  isLoading: false,
  error: undefined,
};

export const loginReducer = <T>(
  state: LoginState,
  action: LoginAction<T>
): LoginState => {
  switch (action.actionType) {
    case 'UPDATE_USERNAME':
      return { ...state, username: action.payload as string };
    case 'UPDATE_PASSWORD':
      return { ...state, password: action.payload as string };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload as boolean };
    case 'SET_ERROR':
      return { ...state, error: action.payload as string | undefined };
    default:
      return state;
  }
};
