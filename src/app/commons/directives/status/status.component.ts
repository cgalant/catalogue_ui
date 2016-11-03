import {Component, OnInit, AfterViewInit} from '@angular/core';
import {
  ToasterService,
  ToasterConfig,
  BodyOutputType
} from "angular2-toaster/angular2-toaster";
import {Observable} from "rxjs";
import {DatasetsActions} from "../../../state/datasets/datasets.actions";
import {Configuration} from "../../../commons/configuration";
import {DatasetsState} from "../../../state/datasets/datasets.reducer";
import {Store} from "@ngrx/store";
import {TranslateService} from "ng2-translate/src/translate.service";

@Component({
  selector: 'app-status',
  templateUrl: 'status.component.html'
})
export class StatusComponent implements AfterViewInit {
  private status: Observable<any>;

  public toasterConfig: ToasterConfig =
    new ToasterConfig({
      showCloseButton: true,
      tapToDismiss: true,
      timeout: 0,
      positionClass: 'toast-bottom-left',
      bodyOutputType: BodyOutputType.TrustedHtml
    });

  constructor(private config: Configuration, private toasterService: ToasterService, private datasetsStore: Store<DatasetsState>, private datasetsAction: DatasetsActions, private translateService: TranslateService) {
    this.status = datasetsStore.select('datasets').map((datasetsState: DatasetsState) => datasetsState.status);

  }

  ngAfterViewInit() {
    this.status.subscribe(statusValue => {
      console.log('statusValue', statusValue)

      if (statusValue.errorMessage) {
        var toast = {
          type: 'error',
          body: this.translateService.get(statusValue.errorMessage, statusValue.errorMessageArgs),
          timeout: this.config.NOTIFY_ERROR_TIMEOUT
        };
        console.log('toast error', toast);
        this.toasterService.pop(toast);
      }
    })
  }

  private getStatus() {
    return this.status;
  }

  private clearStatusNotifyMessage() {
    this.datasetsStore.dispatch(this.datasetsAction.statusClearNotifyMessage());
  }

}