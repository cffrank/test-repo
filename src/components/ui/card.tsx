import React from "react";
import { twMerge } from "tailwind-merge";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
    return (
        <div
            className={twMerge(
                "rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
