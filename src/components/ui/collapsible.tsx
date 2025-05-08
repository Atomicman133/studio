
"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { Slot } from "@radix-ui/react-slot" // Import Slot

// Modified Collapsible to accept and forward asChild
const CollapsibleRoot = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
  // Pass asChild to the Radix Primitive Root
  return <CollapsiblePrimitive.Root ref={ref} asChild={asChild} {...props} />;
});
CollapsibleRoot.displayName = "Collapsible";

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

// Modified CollapsibleContent to accept and forward asChild
const CollapsibleContentPrimitive = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
   // Pass asChild to the Radix Primitive Content
   return <CollapsiblePrimitive.Content ref={ref} asChild={asChild} {...props} />;
});
CollapsibleContentPrimitive.displayName = CollapsiblePrimitive.Content.displayName;


// Re-export with potentially modified names if needed, or keep original names
const Collapsible = CollapsibleRoot;
const CollapsibleContent = CollapsibleContentPrimitive;


export { Collapsible, CollapsibleTrigger, CollapsibleContent }
