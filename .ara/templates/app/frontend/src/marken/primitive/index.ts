/**
 * Die Primitive (Phase H3, erweitert in H4 am 29.08.2026).
 *
 * Sechsundvierzig Grundbausteine auf Radix und Tailwind, aus denen eine
 * Oberflaeche besteht: Knoepfe, Felder, Dialoge, Menues, Reiter, Abzeichen.
 * Sie standen bis H3 in `apps/dashboard-frontend/src/components/ui/shadcn/`
 * und gehoerten damit der Shell allein -- eine App, die einen Knopf brauchte,
 * baute ihren eigenen, und der sah anders aus.
 *
 * WOFUER SIE NICHT DA SIND. Ein Primitiv weiss nichts von Arasul: es kennt
 * keine Route, keinen Endpunkt, keinen Benutzer. Was eine Zusammensetzung
 * aus mehreren von ihnen ist und dabei etwas ueber dieses Geraet weiss --
 * `Modal`, `Section`, `FilterBar`, `AuthCard` --, bleibt in der Shell.
 *
 * WAS H4 DAZUGELEGT HAT und was NICHT. Dazu kamen die zwanzig, die zum
 * Satz noch fehlten -- vom Akkordeon bis zur Tabelle, samt den vieren, die
 * eine Bibliothek von aussen brauchen (`cmdk` fuer die Suchliste,
 * `react-day-picker` fuer den Kalender, `embla-carousel-react` fuer das
 * Karussell, `input-otp` fuer den Einmalcode). NICHT dazu kamen zwei, die
 * shadcn fuehrt und dieses Geraet schon hat: `Drawer` ist `Sheet` von der
 * unteren Kante, und `Sonner` ist `Toast` samt seiner Warteschlange. Zwei
 * Bausteine unter einer Sache sind die Verwechslung selbst -- derselbe
 * Grund, aus dem `marken.py` (Punkt 7) keinen Namen zweimal duldet.
 *
 * ZWEI LAUFZEITEN, UND DAS IST DER UNTERSCHIED ZU DEN SECHS BAUSTEINEN
 * DANEBEN. Die Primitive sind auf Tailwind geschrieben; sie brauchen einen
 * Bau und die Tokens aus `theme.css`. Die sechs Bausteine aus D7 (Kopf,
 * Liste, Karte, Formular, Meldung, Menue) sind auf reinem CSS geschrieben und
 * laufen in einer App OHNE Bau, die nur `browser/marken.js` und `marken.css`
 * laedt. Wer einen Bau hat, nimmt die Primitive.
 */

export { Alert, AlertTitle, AlertDescription } from './alert';
export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Badge, badgeVariants } from './badge';
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './breadcrumb';
export { Button, buttonVariants } from './button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';
export { Checkbox } from './checkbox';
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuGroup,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from './context-menu';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu';
export { Input } from './input';
export { Label } from './label';
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from './popover';
export { Progress } from './progress';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { ScrollArea, ScrollBar } from './scroll-area';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
export { Separator } from './separator';
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet';
export { Skeleton } from './skeleton';
export type { SkeletonProps } from './skeleton';
export { Switch } from './switch';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Textarea } from './textarea';
export { Toast, ToastViewport, ToastIcon, ToastMessage, ToastClose, toastVariants } from './toast';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export { AspectRatio } from './aspect-ratio';
export { Calendar, CalendarDayButton } from './calendar';
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from './carousel';
export type { KarussellApi } from './carousel';
export { Chart, Sparkline, SERIENFARBEN } from './chart';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command';
export { DatePicker } from './date-picker';
export type { DatePickerProps } from './date-picker';
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './form';
export { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './input-otp';
export {
  Menubar,
  MenubarMenu,
  MenubarGroup,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from './menubar';
export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from './navigation-menu';
export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './pagination';
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './resizable';
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './sidebar';
export { Slider } from './slider';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';
export { Toggle, toggleVariants } from './toggle';
export { ToggleGroup, ToggleGroupItem } from './toggle-group';
