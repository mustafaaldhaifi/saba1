// modal.service.ts
import { Injectable, ComponentRef, Injector, ApplicationRef, ComponentFactoryResolver } from '@angular/core';
import { ReasonDialogComponent } from './reason-dialog/reason-dialog.component';

@Injectable({ providedIn: 'root' })
export class ModalService {
    constructor(
        private appRef: ApplicationRef,
        private injector: Injector,
        private resolver: ComponentFactoryResolver
    ) { }


    open(component: any, data?: { [key: string]: any }): { result: Promise<any> } {
        const componentRef = this.createComponent(component);

        // ⬅️ تمرير البيانات إلى الخصائص @Input
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                if (componentRef.instance.hasOwnProperty(key)) {
                    (componentRef.instance as any)[key] = value;
                }
            });
        }

        return new PromiseWrapper(componentRef);
    }

    //   open(component: any): { result: Promise<any> } {
    //     return new PromiseWrapper(this.createComponent(component));
    //   }

    private createComponent(component: any): ComponentRef<any> {
        const factory = this.resolver.resolveComponentFactory(component);
        const componentRef = factory.create(this.injector);

        this.appRef.attachView(componentRef.hostView);
        const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
        document.body.appendChild(domElem);

        return componentRef;
    }
}

class PromiseWrapper {
    private _resolve!: (value: any) => void;
    private _reject!: (reason?: any) => void;

    public result: Promise<any>;

    constructor(private componentRef: ComponentRef<any>) {
        this.result = new Promise((res, rej) => {
            this._resolve = res;
            this._reject = rej;

            // Listen to component events
            if (componentRef.instance.onConfirm) {
                componentRef.instance.onConfirm.subscribe((data: any) => {
                    this.close();
                    this._resolve(data);
                });
            }

            if (componentRef.instance.onCancel) {
                componentRef.instance.onCancel.subscribe(() => {
                    this.close();
                    this._reject();
                });
            }
        });
    }

    private close() {
        this.componentRef.destroy();
    }
}
