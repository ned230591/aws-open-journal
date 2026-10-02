import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MAT_TOOLTIP_SCROLL_STRATEGY,
  MatTooltip,
  SCROLL_THROTTLE_MS,
  TOOLTIP_PANEL_CLASS,
  TooltipComponent,
  getMatTooltipInvalidPositionError
} from "./chunk-6NPP2DTN.js";
import {
  OverlayModule
} from "./chunk-36FJVYZF.js";
import {
  CdkScrollableModule
} from "./chunk-DRXINXOR.js";
import "./chunk-YLKKSZLG.js";
import "./chunk-NGNSJ532.js";
import {
  A11yModule
} from "./chunk-HSH5IPQB.js";
import "./chunk-GWBU7KI5.js";
import "./chunk-PQSDWYFL.js";
import "./chunk-4YILHFKV.js";
import "./chunk-JSAKNJZX.js";
import "./chunk-GUGIMSVJ.js";
import {
  BidiModule
} from "./chunk-FPL2MV7B.js";
import "./chunk-EE3ACCEM.js";
import "./chunk-ZK6DJLLL.js";
import "./chunk-6HQCYASY.js";
import "./chunk-PMLC7POC.js";
import "./chunk-AJP44ORY.js";
import "./chunk-G4KSZXHQ.js";
import {
  NgModule,
  setClassMetadata,
  ɵɵdefineInjector,
  ɵɵdefineNgModule
} from "./chunk-CWW4NVBF.js";
import "./chunk-RSS3ODKE.js";
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
