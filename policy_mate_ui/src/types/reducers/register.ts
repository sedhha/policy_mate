// Registration state and action types
type RegisterState = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  firstName: string;
  lastName: string;
  isLoading: boolean;
  error?: string;
  // For email confirmation step
  showConfirmation: boolean;
  confirmationCode: string;
  resendingCode: boolean;
};

type RegisterActionTypes =
  | 'UPDATE_EMAIL'
  | 'UPDATE_PASSWORD'
  | 'UPDATE_CONFIRM_PASSWORD'
  | 'UPDATE_USERNAME'
  | 'UPDATE_FIRST_NAME'
  | 'UPDATE_LAST_NAME'
  | 'UPDATE_CONFIRMATION_CODE'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'SET_SHOW_CONFIRMATION'
  | 'SET_RESENDING_CODE'
  | 'RESET_FORM';

type RegisterAction<T> = {
  actionType: RegisterActionTypes;
  payload?: T;
};

export type { RegisterActionTypes, RegisterState, RegisterAction };
