declare module 'page-flip' {
  export class PageFlip {
    constructor(element: HTMLElement | string, options: any);
    loadFromHTML(pages: NodeListOf<Element> | Element[]): void;
    updateFromHtml(pages: NodeListOf<Element> | Element[]): void;
    flip(page: number): void;
    flipNext(): void;
    flipPrev(): void;
    getCurrentPageIndex(): number;
  }
}