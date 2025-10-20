import { RegisterAction, RegisterState } from '@/types/reducers/register';

export const registerState: RegisterState = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  firstName: '',
  lastName: '',
  isLoading: false,
  error: undefined,
  showConfirmation: false,
  confirmationCode: '',
  resendingCode: false,
};

export const registerReducer = <T>(
  state: RegisterState,
  action: RegisterAction<T>
): RegisterState => {
  switch (action.actionType) {
    case 'UPDATE_EMAIL':
      return { ...state, email: action.payload as string };
    case 'UPDATE_PASSWORD':
      return { ...state, password: action.payload as string };
    case 'UPDATE_CONFIRM_PASSWORD':
      return { ...state, confirmPassword: action.payload as string };
    case 'UPDATE_USERNAME':
      return { ...state, username: action.payload as string };
    case 'UPDATE_FIRST_NAME':
      return { ...state, firstName: action.payload as string };
    case 'UPDATE_LAST_NAME':
      return { ...state, lastName: action.payload as string };
    case 'UPDATE_CONFIRMATION_CODE':
      return { ...state, confirmationCode: action.payload as string };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload as boolean };
    case 'SET_ERROR':
      return { ...state, error: action.payload as string | undefined };
    case 'SET_SHOW_CONFIRMATION':
      return { ...state, showConfirmation: action.payload as boolean };
    case 'SET_RESENDING_CODE':
      return { ...state, resendingCode: action.payload as boolean };
    case 'RESET_FORM':
      return { ...registerState };
    default:
      return state;
  }
};
