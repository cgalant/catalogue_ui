import { Component, Input, Output, EventEmitter, ViewChild } from "@angular/core";
import { Actions } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { PaginationService } from "ng2-pagination";
import { Configuration } from "../../commons/configuration";
import { SortOrder } from "../../commons/directives/sort-link/sort-link.component";
import { FeedsApiService, FEED_RETRIEVAL_METHOD, ILicense, IFeed } from "../../commons/services/api/feedsApi.service";
import { UsersApiService } from "../../commons/services/api/usersApi.service";
import { SessionService } from "../../commons/services/session.service";
import { UtilsService } from "../../commons/services/utils.service";
import { DatasetsActions, DatasetsActionType } from "../../state/datasets/datasets.actions";
import { DatasetsState } from "../../state/datasets/datasets.reducer";
import { IFeedRow } from "../datasets/datasets.component";
import { SharedService } from "../../commons/services/shared.service";
import { DatatoolComponent } from "../../commons/components/datatool.component";

@Component({
    selector: 'app-datasets-table',
    templateUrl: 'datasets-table.component.html',
    providers: [PaginationService]
})
export class DatasetsTableComponent extends DatatoolComponent{
    @Input() protected _feeds: IFeedRow[];
    @Input() protected chkAll: boolean = false;
    @Output() protected sortChange = new EventEmitter();
    private FEED_RETRIEVAL_METHOD = FEED_RETRIEVAL_METHOD; // used by the template
    private checkById: Map<string, boolean> = new Map<string, boolean>();
    private page: number;

    protected currentSort: SortOrder = {
        sort: 'name',
        order: 'asc'
    };

    constructor(
        protected config: Configuration,
        protected utils: UtilsService,
        protected sessionService: SessionService,
        protected feedsApiService: FeedsApiService,
        protected usersApiService: UsersApiService,
        protected store: Store<DatasetsState>,
        protected actions$: Actions,
        protected datasetsAction: DatasetsActions,
        protected shared: SharedService) {
          super(config, utils, sessionService, feedsApiService, usersApiService, store,
          actions$, datasetsAction, shared);
        this.subscribeActions(actions$);
    }

    // overriden by childs
    @Input() set feeds(value: any) {

        this.getLicenses(value);
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

    protected getFeedsVersion(values: any) {
        for (var i = 0; values && i < values.length; i++) {
            this.getFeedVersion(values[i]);
        }
    }

    protected setSort(sort) {
        this.sortChange.emit(sort);
    }

    protected checkAll() {
        let newValue = !this.chkAll;
        this.feeds.forEach(feed => { this.checkById[feed.id] = newValue; });
        this.chkAll = newValue;
    }

    protected regionStateCountry(feed) {
        return this.utils.regionStateCountry(feed);
    }

    public getCheckedFeeds(): IFeedRow[] {
        if (!this.feeds) {
            // component not initialized yet
            return [];
        }
        return this.feeds.filter(feed => this.checkById[feed.id]);
    }

    protected subscribeActions(actions$) {
        // close inline edit form on setName() success
        actions$.ofType(DatasetsActionType.USER_SUBSCRIBE_SUCCESS).subscribe(
            () => {
                console.log('USER_SUBSCRIBE setting profile');
                this.sessionService.setProfile();
            }
        );
        actions$.ofType(DatasetsActionType.UNSUBSCRIBE_FEED_SUCCESS).subscribe(
            () => {
                console.log('UNSUBSCRIBE_FEED setting profile');
                this.sessionService.setProfile();
            }
        );
    }

    public resetPage() {
        this.page = 1;
    }
}
