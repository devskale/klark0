import React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

type CardSectionProps = {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function CardSection({ title, children, footer }: CardSectionProps) {
  return (
    <Card className="my-4 shadow-md">
      <CardHeader>
        <h2 className="text-xl font-bold">{title}</h2>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
