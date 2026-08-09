import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  rightContent?: ReactNode;
}

export default function Header({ title, rightContent }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm px-3 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
        {rightContent && <div className="flex-shrink-0 ml-3">{rightContent}</div>}
      </div>
    </header>
  );
}