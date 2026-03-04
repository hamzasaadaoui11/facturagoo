
import React, { ReactNode } from 'react';

interface HeaderProps {
    title: string;
    children?: ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, children }) => {
    return (
        <div className="mb-10 md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
                <h2 className="text-3xl font-bold leading-tight text-neutral-900 sm:truncate">
                    {title}
                </h2>
            </div>
            <div className="mt-4 flex flex-shrink-0 md:ml-4 md:mt-0">
                {children}
            </div>
        </div>
    );
};

export default Header;
