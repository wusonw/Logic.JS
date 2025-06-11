import { Editor } from '../Editor';

export interface Plugin {
  name: string;
  install(editor: Editor): void;
  destroy?(): void;
}

export * from './History'; 
