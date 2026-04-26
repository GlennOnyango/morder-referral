/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface GithubComVaudKKNrsNotificationsInternalModelsNotification {
  createdAt?: string;
  eventType?: string;
  id?: string;
  isRead?: boolean;
  payload?: object;
  referralCode?: string;
  referralId?: string;
  sourceOrganizationId?: string;
  targetFacilityCode?: string;
  targetOrganizationId?: string;
  updatedAt?: string;
}

export interface InternalHandlerErrorResponse {
  error?: string;
  message?: string;
}

export interface InternalHandlerNotificationListResponse {
  items?: GithubComVaudKKNrsNotificationsInternalModelsNotification[];
}

export interface InternalHandlerStatusResponse {
  message?: string;
  status?: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "/";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title NRS Notifications API
 * @version 1.0
 * @baseUrl /
 * @contact
 *
 * Notification service API for health checks, notification listing, read acknowledgements, and SSE streams.
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description Returns notifications for the authenticated user's scoped organization, optionally narrowed by facility and unread status.
     *
     * @tags notifications
     * @name V1NotificationsList
     * @summary List notifications
     * @request GET:/api/v1/notifications
     * @secure
     */
    v1NotificationsList: (
      query?: {
        /** Facility code to narrow organization notifications */
        facility_code?: string;
        /** Only return unread notifications */
        unread_only?: boolean;
        /**
         * Maximum number of notifications to return
         * @min 1
         * @max 100
         */
        limit?: number;
        /**
         * Pagination offset
         * @min 0
         */
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        InternalHandlerNotificationListResponse,
        InternalHandlerErrorResponse
      >({
        path: `/api/v1/notifications`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Opens a server-sent events stream scoped to the authenticated user's organization.
     *
     * @tags notifications
     * @name V1NotificationsStreamList
     * @summary Stream notifications by organization
     * @request GET:/api/v1/notifications/stream
     * @secure
     */
    v1NotificationsStreamList: (
      query?: {
        /** Organization scope override; must match the authenticated user's scope */
        organization_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<string, InternalHandlerErrorResponse>({
        path: `/api/v1/notifications/stream`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * @description Opens a server-sent events stream for the authenticated user's organization while preserving the legacy facility-based route.
     *
     * @tags notifications
     * @name V1NotificationsStreamDetail
     * @summary Stream notifications using facility route
     * @request GET:/api/v1/notifications/stream/{facilityCode}
     * @secure
     */
    v1NotificationsStreamDetail: (
      facilityCode: string,
      params: RequestParams = {},
    ) =>
      this.request<string, InternalHandlerErrorResponse>({
        path: `/api/v1/notifications/stream/${facilityCode}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Marks a notification as read when it belongs to the authenticated user's scoped organization and optional facility filter.
     *
     * @tags notifications
     * @name V1NotificationsReadPartialUpdate
     * @summary Mark notification as read
     * @request PATCH:/api/v1/notifications/{id}/read
     * @secure
     */
    v1NotificationsReadPartialUpdate: (
      id: string,
      query?: {
        /** Facility code to enforce facility-level ownership */
        facility_code?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        GithubComVaudKKNrsNotificationsInternalModelsNotification,
        InternalHandlerErrorResponse
      >({
        path: `/api/v1/notifications/${id}/read`,
        method: "PATCH",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  healthz = {
    /**
     * @description Returns a lightweight liveness response.
     *
     * @tags health
     * @name HealthzList
     * @summary Health check
     * @request GET:/healthz
     */
    healthzList: (params: RequestParams = {}) =>
      this.request<InternalHandlerStatusResponse, any>({
        path: `/healthz`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  readyz = {
    /**
     * @description Returns readiness status based on database connectivity.
     *
     * @tags health
     * @name ReadyzList
     * @summary Readiness check
     * @request GET:/readyz
     */
    readyzList: (params: RequestParams = {}) =>
      this.request<
        InternalHandlerStatusResponse,
        InternalHandlerStatusResponse
      >({
        path: `/readyz`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
