import {Component, Output, EventEmitter, Input} from "@angular/core";
import {DatasetsTableComponent} from "../datasets-table/datasets-table.component";
import {IFeed, FeedsApiService} from "../../commons/services/api/feedsApi.service";
import {DatasetsState} from "../../state/datasets/datasets.reducer";
import {Store} from "@ngrx/store";
import {DatasetsActions, toFeedReference, DatasetsActionType} from "../../state/datasets/datasets.actions";
import {UtilsService} from "../../commons/services/utils.service";
import {PaginationService} from "ng2-pagination";
import {Configuration} from "../../commons/configuration";
import {Actions} from "@ngrx/effects";
//import {Map} from "@angular/core/src/facade/collection";
import {InlineEditEvent} from "../../commons/directives/inline-edit-text/inline-edit-generic.component";

const CONFIRM_EDIT_IDX_SETNAME = "setName"
const CONFIRM_EDIT_IDX_SETFILE = "setFile"

@Component({
    selector: 'app-my-datasets-table',
    templateUrl: 'my-datasets-table.component.html',
    providers: [PaginationService]
})
export class MyDatasetsTableComponent extends DatasetsTableComponent {
  @Output() protected sortChange = new EventEmitter();

  private confirmEditById: Map<string,EventEmitter<any>> = new Map()

  constructor(config: Configuration, utils: UtilsService, private feedsApi: FeedsApiService, protected store: Store<DatasetsState>, protected datasetsAction: DatasetsActions, protected actions$: Actions) {
    super(config, utils);

    // close inline edit form on setName() success
    actions$.ofType(DatasetsActionType.FEED_SET_NAME_SUCCESS)
      .subscribe(action => {
        let updatedFeed = action.payload.feed
        this.processConfirm(CONFIRM_EDIT_IDX_SETNAME + updatedFeed.id)
      })

    // close inline edit form on setFile() success
    actions$.ofType(DatasetsActionType.FEED_SET_FILE_SUCCESS)
      .subscribe(action => {
        let updatedFeed = action.payload.feed
        this.processConfirm(CONFIRM_EDIT_IDX_SETFILE + updatedFeed.id)
      })
  }

  private processConfirm(idx: string) {
    let confirmEdit = this.confirmEditById.get(idx)
    if (confirmEdit) {
      confirmEdit.emit(true);
      this.confirmEditById.delete(idx)
    }
  }

  // override parent
  @Input() set feeds(value: any) {
    if (!value) {
      this._feeds = null
      return
    }
    this._feeds = value
  }

  // overriden by childs
  get feeds() {
    return this._feeds;
  }

  setSort(sort) {
    this.sortChange.emit(sort);
  }

  togglePublic(feed: IFeed) {
    let value = !feed.isPublic;
    this.store.dispatch(this.datasetsAction.feedSetPublic(toFeedReference(feed), value));
    return false;
  }

  setName(feed, event: InlineEditEvent<string>) {
    // observer will be notified to close inline form on success
    this.confirmEditById.set(CONFIRM_EDIT_IDX_SETNAME + feed.id, event.confirm$)

    // process
    this.store.dispatch(this.datasetsAction.feedSetName(toFeedReference(feed), event.value));
    return false;
  }

  setFile(feed, event: InlineEditEvent<File>) {
    // observer will be notified to close inline form on success
    this.confirmEditById.set(CONFIRM_EDIT_IDX_SETFILE + feed.id, event.confirm$)

    // process
    this.store.dispatch(this.datasetsAction.feedSetFile(toFeedReference(feed), event.value));
    return false;
  }

  fetchFeed(feed) {
    this.store.dispatch(this.datasetsAction.feedFetch(toFeedReference(feed)));
  }

}