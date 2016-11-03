import {Injectable} from "@angular/core";
import {Http} from "@angular/http";
import {Observable} from "rxjs/Rx";
import {Configuration} from "../../configuration";
import {AbstractApiService} from "./abstractApi.service";
import {IFeedApi, IBounds} from "./feedsApi.service";
import {AuthHttp, AuthConfig} from "angular2-jwt";
import {SortOrder} from "../../directives/sort-link/sort-link.component";

export type IProject = {
  id: string,
  name: string,
  defaultLocationLat: number,
  defaultLocationLon: number,
  feedSources: IFeedApi[]
};

@Injectable()
export class ProjectsApiService extends AbstractApiService {
  private PROJECT_SECURE_URL: string;
  private PROJECT_PUBLIC_URL: string;

  constructor(protected http: Http, protected authHttp: AuthHttp, protected authConfig: AuthConfig, protected config: Configuration) {
    super(http, authHttp, authConfig, config);
    this.PROJECT_SECURE_URL = this.config.ROOT_API + "/api/manager/secure/project";
    this.PROJECT_PUBLIC_URL = this.config.ROOT_API + "/api/manager/public/project";
  }

  public create(name: string): Observable<IProject> {
    let params = JSON.stringify({
      name: name
    });
    return this.authHttp.post(this.PROJECT_SECURE_URL, params)
      .map <IProject>(response => response.json());
  }

  public delete(projectId: string): Observable<any> {
    return this.authHttp.delete(this.PROJECT_SECURE_URL + "/" + projectId);
  }

  public getPublicList(bounds: IBounds, sortOrder: SortOrder): Observable<IProject[]> {
    return this.http.get(this.PROJECT_PUBLIC_URL + "?" + this.sortQuery(sortOrder) + "&" + this.boundsQuery(bounds))
      .map<IProject[]>(response => response.json());
  }

  public getSecureList(bounds: IBounds, sortOrder: SortOrder): Observable<IProject[]> {
    return this.authHttp.get(this.PROJECT_SECURE_URL + "?" + this.sortQuery(sortOrder) + "&" + this.boundsQuery(bounds))
      .map<IProject[]>(response => response.json());
  }

  private sortQuery(sortOrder: SortOrder) {
    if (!sortOrder) {
      return "";
    }
    return "sort=" + sortOrder.sort + "&order=" + sortOrder.order;
  }

  private boundsQuery(bounds: IBounds) {
    if (!bounds) {
      return "";
    }
    return "north=" + bounds.north + "&south=" + bounds.south + "&east=" + bounds.east + "&west=" + bounds.west;
  }

}