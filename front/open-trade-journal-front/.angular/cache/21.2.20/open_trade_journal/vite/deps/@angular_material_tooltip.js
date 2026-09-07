import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MAT_TOOLTIP_SCROLL_STRATEGY,
  MatTooltip,
  SCROLL_THROTTLE_MS,
  TOOLTIP_PANEL_CLASS,
  TooltipComponent,
  getMatTooltipInvalidPositionError
} from "./chunk-BYGHPV7B.js";
import {
  OverlayModule
} from "./chunk-QGVA2ZOY.js";
import {
  CdkScrollableModule
} from "./chunk-44LVALXT.js";
import "./chunk-HFWP7QP6.js";
import "./chunk-L4OBSDE3.js";
import {
  A11yModule
} from "./chunk-45QUXX57.js";
import "./chunk-GWBU7KI5.js";
import "./chunk-GUGIMSVJ.js";
import "./chunk-EPPI6QY7.js";
import "./chunk-GZ7222W7.js";
import "./chunk-WANQQZRP.js";
import "./chunk-KLHVZ4IP.js";
import "./chunk-MNLI7LC4.js";
import "./chunk-YQJIRXWL.js";
import {
  BidiModule
} from "./chunk-I75RWE44.js";
import "./chunk-W66QHAO2.js";
import "./chunk-TVAFBV2C.js";
import "./chunk-46CW7IFJ.js";
import {
  NgModule,
  setClassMetadata,
  ɵɵdefineInjector,
  ɵɵdefineNgModule
} from "./chunk-BVQHSO4K.js";
import "./chunk-Y72XGDAT.js";
import "./chunk-HSWANC32.js";
import "./chunk-GLT7DQUO.js";

// node_modules/@angular/material/fesm2022/tooltip.mjs
var MatTooltipModule = class _MatTooltipModule {
  static ɵfac = function MatTooltipModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MatTooltipModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _MatTooltipModule,
    imports: [A11yModule, OverlayModule, MatTooltip, TooltipComponent],
    exports: [MatTooltip, TooltipComponent, BidiModule, CdkScrollableModule]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [A11yModule, OverlayModule, BidiModule, CdkScrollableModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatTooltipModule, [{
    type: NgModule,
    args: [{
      imports: [A11yModule, OverlayModule, MatTooltip, TooltipComponent],
      exports: [MatTooltip, TooltipComponent, BidiModule, CdkScrollableModule]
    }]
  }], null, null);
})();
export {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MAT_TOOLTIP_SCROLL_STRATEGY,
  MatTooltip,
  MatTooltipModule,
  SCROLL_THROTTLE_MS,
  TOOLTIP_PANEL_CLASS,
  TooltipComponent,
  getMatTooltipInvalidPositionError
};
//# sourceMappingURL=@angular_material_tooltip.js.map
