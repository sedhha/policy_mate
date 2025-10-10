type LoginState = {
  username: string;
  password: string;
  isLoading: boolean;
  error?: string;
};

type ActionTypes =
  | 'UPDATE_USERNAME'
  | 'UPDATE_PASSWORD'
  | 'SET_LOADING'
  | 'SET_ERROR';

type LoginAction<T> = {
  actionType: ActionTypes;
  payload: T;
};

export type { ActionTypes, LoginState, LoginAction };
