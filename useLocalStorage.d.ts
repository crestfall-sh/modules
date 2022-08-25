/**
 * @description uses LocalStorage API + JSON.stringify and JSON.parse
 * @description https://blog.logrocket.com/using-localstorage-react-hooks/
 */
export type useLocalStorage<T> = (key: string, default_value: T) => [T, React.Dispatch<T>];
export const useLocalStorage: useLocalStorage;