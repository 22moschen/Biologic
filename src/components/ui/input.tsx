import * as React from "react";
import {cn} from "@/lib/utils";
export function Input({className,...props}:React.ComponentProps<"input">){return <input data-slot="input" className={cn("w-full rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60",className)} {...props}/>;}
