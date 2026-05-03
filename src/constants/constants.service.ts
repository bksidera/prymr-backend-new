import { Injectable } from '@nestjs/common';

@Injectable()
export class ConstantsService {
  readonly signBy = {
    google: 'google',
    facebook: 'facebook',
    apple: 'apple',
    twitter: 'twitter',
    self: 'self',
  };
  readonly boardStatus = {
    draft: 'draft',
    finished: 'finished',
    published: 'published',
    inProgress: 'inProgress',
  };


readonly paymentReason={
  tappable:"tappable",
  replace:"replace",
  vanish:"vanish"
}

  readonly rating = {
    G: 'G',
    PG: 'PG',
    PG13: 'PG-13',
    R: 'R',
  };

  readonly assetType = {
    physical: 'physical',
    digital: 'digital',
  };

  readonly bookmarkFeatureType = {
    sale: 'sale',
    board: 'board',
  };

  readonly isSaleOrBoard = {
    sale: 'sale',
    board: 'board',
  };

  readonly userRole = {
    user: 'user',
    privateUser: 'privateUser',
    publicUser: 'publicUser',
  };

  readonly newUserRole = {
    standardUser: 'standardUser',
    privateCreator: 'privateCreator',
    publicCreator: 'publicCreator',
    admin: 'admin',
  };

  readonly reactionType = {
    text: 'text',
    photo: 'photo',
    video: 'video',
    emoji: 'emoji',
  };

  readonly requestCreator = {
    Requested: "Requested",
    Rejected: "Rejected",
    Approved: "Approved",
    Blocked: "Blocked"
 };


 readonly PaymentPurpose={
  tip:"tip", //support  ->board id
  normal:"normal",//->info-ovrlay->tappable id
  vanish :"vanish",//switchId
  replace:"replace"//replaceId
 }


 readonly replaceOrVanishSubActionName={
  Payment:"Payment", //support  ->board id
  Follow:"Follow'"
 }

 

 

}
