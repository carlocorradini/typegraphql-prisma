import "reflect-metadata";
import {
  // ObjectType,
  Resolver,
  Query,
  buildSchema,
  FieldResolver,
  Ctx,
  Args,
  Mutation,
  Authorized,
  Extensions,
} from "type-graphql";
import { ApolloServer } from "apollo-server";
import path from "path";
import { MinLength, ValidateNested } from "class-validator";

import {
  Client,
  ClientRelationsResolver,
  ClientCrudResolver,
  Post,
  PostRelationsResolver,
  FindUniquePostResolver,
  CreatePostResolver,
  UpdateManyPostResolver,
  // Category,
  // Patient,
  PatientCrudResolver,
  FindManyPostResolver,
  MovieCrudResolver,
  DirectorCrudResolver,
  DirectorRelationsResolver,
  MovieRelationsResolver,
  FindManyClientArgs,
  ProblemRelationsResolver,
  CreatorRelationsResolver,
  CreatePostArgs,
  ResolversEnhanceMap,
  applyResolversEnhanceMap,
  ResolverActionsConfig,
  FindManyCategoryResolver,
  ModelsEnhanceMap,
  applyModelsEnhanceMap,
  ModelConfig,
  applyOutputTypesEnhanceMap,
  OutputTypeConfig,
  GroupByCategoryResolver,
  GroupByPostResolver,
  applyInputTypesEnhanceMap,
  applyArgsTypesEnhanceMap,
  NativeTypeModelCrudResolver,
} from "./prisma/generated/type-graphql";
import { PrismaClient } from "./prisma/generated/client";
import * as Prisma from "./prisma/generated/client";
import { ProblemCrudResolver } from "./prisma/generated/type-graphql/resolvers/crud/Problem/ProblemCrudResolver";
import { CreatorCrudResolver } from "./prisma/generated/type-graphql/resolvers/crud/Creator/CreatorCrudResolver";

const problemTypeFieldsConfig: ModelConfig<"Problem"> = {
  fields: {
    likedBy: [Authorized()],
  },
};
const modelsEnhanceMap: ModelsEnhanceMap = {
  Problem: problemTypeFieldsConfig,
  Director: {
    class: [Extensions({ isDirector: true })],
    fields: {
      movies: [Authorized()],
    },
  },
};
applyModelsEnhanceMap(modelsEnhanceMap);

const aggregateClientConfig: OutputTypeConfig<"AggregateClient"> = {
  fields: {
    avg: [Extensions({ complexity: 10 })],
  },
};
applyOutputTypesEnhanceMap({
  AggregateClient: aggregateClientConfig,
  ClientAvgAggregate: {
    fields: {
      age: [Authorized()],
    },
  },
});

applyArgsTypesEnhanceMap({
  CreateProblemArgs: {
    fields: {
      data: [ValidateNested()],
    },
  },
});

applyInputTypesEnhanceMap({
  ProblemCreateInput: {
    fields: {
      problemText: [MinLength(10)],
    },
  },
});

const directorActionsConfig: ResolverActionsConfig<"Director"> = {
  createDirector: [Authorized()],
};
const resolversEnhanceMap: ResolversEnhanceMap = {
  Category: {
    categories: [Authorized()],
  },
  Director: directorActionsConfig,
};
applyResolversEnhanceMap(resolversEnhanceMap);

interface Context {
  prisma: PrismaClient;
}

@Resolver(of => Client)
class ClientResolver {
  @Query(returns => [Client])
  async allClients(@Ctx() { prisma }: Context): Promise<Prisma.User[]> {
    return await prisma.user.findMany();
  }

  @Query(returns => [Client])
  async customFindClientsWithArgs(
    @Args() args: FindManyClientArgs,
    @Ctx() { prisma }: Context,
  ): Promise<Prisma.User[]> {
    return prisma.user.findMany(args);
  }

  @FieldResolver()
  hello(): string {
    return "world!";
  }
}

@Resolver(of => Post)
class PostResolver {
  @Query(returns => [Post])
  async allPosts(@Ctx() { prisma }: Context): Promise<Post[]> {
    return (await prisma.post.findMany()) as Post[];
  }

  @Mutation(returns => Post)
  async customCreatePost(
    @Ctx() { prisma }: Context,
    @Args() args: CreatePostArgs,
  ): Promise<Post> {
    return await prisma.post.create(args);
  }
}

async function main() {
  const schema = await buildSchema({
    resolvers: [
      ClientResolver,
      ClientRelationsResolver,
      ClientCrudResolver,
      PostResolver,
      PostRelationsResolver,
      FindUniquePostResolver,
      CreatePostResolver,
      UpdateManyPostResolver,
      // CategoryCrudResolver,
      FindManyCategoryResolver,
      PatientCrudResolver,
      FindManyPostResolver,
      MovieCrudResolver,
      MovieRelationsResolver,
      DirectorCrudResolver,
      DirectorRelationsResolver,
      ProblemCrudResolver,
      CreatorCrudResolver,
      ProblemRelationsResolver,
      CreatorRelationsResolver,
      GroupByCategoryResolver,
      GroupByPostResolver,
      NativeTypeModelCrudResolver,
    ],
    validate: true,
    emitSchemaFile: path.resolve(__dirname, "./generated-schema.graphql"),
    authChecker: ({ info }) => {
      console.log(
        `${info.parentType.name}.${info.fieldName} requested, access prohibited`,
      );
      return false;
    },
  });

  const prisma = new PrismaClient({
    // see dataloader for relations in action
    log: ["query"],
  });

  await prisma.$connect();

  const server = new ApolloServer({
    schema,
    playground: true,
    context: (): Context => ({ prisma }),
  });
  const { port } = await server.listen(4000);
  console.log(`GraphQL is listening on ${port}!`);
}

main().catch(console.error);
